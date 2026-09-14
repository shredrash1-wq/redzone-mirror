// ── Universal Anime Sub/Dub Episode Resolver (Web, Android & Electron) ─────

const ALLANIME_HEX_MAP = {
  "79": "A", "7a": "B", "7b": "C", "7c": "D", "7d": "E", "7e": "F", "7f": "G",
  "70": "H", "71": "I", "72": "J", "73": "K", "74": "L", "75": "M", "76": "N",
  "77": "O", "68": "P", "69": "Q", "6a": "R", "6b": "S", "6c": "T", "6d": "U",
  "6e": "V", "6f": "W", "60": "X", "61": "Y", "62": "Z", "59": "a", "5a": "b",
  "5b": "c", "5c": "d", "5d": "e", "5e": "f", "5f": "g", "50": "h", "51": "i",
  "52": "j", "53": "k", "54": "l", "55": "m", "56": "n", "57": "o", "48": "p",
  "49": "q", "4a": "r", "4b": "s", "4c": "t", "4d": "u", "4e": "v", "4f": "w",
  "40": "x", "41": "y", "42": "z", "08": "0", "09": "1", "0a": "2", "0b": "3",
  "0c": "4", "0d": "5", "0e": "6", "0f": "7", "00": "8", "01": "9", "15": "-",
  "16": ".", "67": "_", "46": "~", "02": ":", "17": "/", "07": "?", "1b": "#",
  "63": "[", "65": "]", "78": "@", "19": "!", "1c": "$", "1e": "&", "10": "(",
  "11": ")", "12": "*", "13": "+", "14": ",", "03": ";", "05": "=", "1d": "%",
};

export function decodeAllanimeUrl(encoded) {
  if (!encoded) return "";
  if (encoded.startsWith("--")) encoded = encoded.slice(2);
  let result = "";
  for (let i = 0; i < encoded.length; i += 2) {
    const pair = encoded.slice(i, i + 2);
    result += ALLANIME_HEX_MAP[pair] !== undefined ? ALLANIME_HEX_MAP[pair] : pair;
  }
  return result.replace(/\\u002F/gi, "/").replace(/\\\|/g, "");
}

function sanitizeTitle(t) {
  if (!t) return "";
  return t
    .replace(/[''`´]/g, "")
    .replace(/[:!.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SEARCH_GQL = `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeEnumType,$countryOrigin:VaildCountryOriginEnumType){shows(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){edges{_id name englishName nativeName thumbnail availableEpisodesDetail}}}`;
const EPISODE_GQL = `query($showId:String!,$translationType:VaildTranslationTypeEnumType!,$episodeString:String!){episode(showId:$showId,translationType:$translationType,episodeString:$episodeString){sourceUrls}}`;

async function fetchAllanimeGQL(variables, query) {
  const endpoints = [
    "https://api.allanime.day/api",
    "https://allanime.to/api",
    "https://api.allmanga.to/api",
  ];

  for (const endpoint of endpoints) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ variables, query }),
      });
      if (resp.ok) {
        const json = await resp.json();
        return json;
      }
    } catch {
      // Try next endpoint or proxy
    }
  }

  // Fallback via CORS proxy if direct fails in browser/webview
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent("https://api.allanime.day/api")}`;
    const resp = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variables, query }),
    });
    if (resp.ok) return await resp.json();
  } catch {
    // Continue
  }

  return null;
}

export async function resolveAnimeEpisode({
  title,
  seasonNumber = 1,
  episodeNumber = 1,
  isMovie = false,
  translationType = "sub",
}) {
  const dubSub = translationType === "dub" ? "dub" : "sub";

  // 1. Electron IPC Bridge if running in Desktop Electron
  if (typeof window !== "undefined" && window.electron?.resolveAllManga) {
    try {
      const res = await window.electron.resolveAllManga({
        title,
        seasonNumber,
        episodeNumber,
        isMovie,
        translationType: dubSub,
      });
      if (res && res.ok) return res;
    } catch (e) {
      console.warn("Electron resolveAllManga fallback:", e);
    }
  }

  // 2. Client-side / Web / Android Resolver
  try {
    const epStr = isMovie ? "1" : String(episodeNumber);
    const cleanTitle = sanitizeTitle(title);
    const candidates = [title, cleanTitle].filter(Boolean);

    let foundShow = null;
    for (const query of candidates) {
      const data = await fetchAllanimeGQL(
        {
          search: {
            allowAdult: true,
            allowUnknown: false,
            query: query.toLowerCase(),
          },
          limit: 30,
          page: 1,
          translationType: dubSub,
          countryOrigin: "ALL",
        },
        SEARCH_GQL
      );

      const edges = data?.data?.shows?.edges;
      if (edges && edges.length > 0) {
        // Find best match
        foundShow =
          edges.find((e) => (e.name || "").toLowerCase() === query.toLowerCase()) ||
          edges.find((e) => (e.englishName || "").toLowerCase() === query.toLowerCase()) ||
          edges[0];
        break;
      }
    }

    if (!foundShow?._id) {
      return { ok: false, error: `No ${dubSub.toUpperCase()} results found for "${title}"` };
    }

    // Resolve episode source URLs
    const epData = await fetchAllanimeGQL(
      {
        showId: foundShow._id,
        translationType: dubSub,
        episodeString: epStr,
      },
      EPISODE_GQL
    );

    const rawSources = epData?.data?.episode?.sourceUrls || [];
    const usableSources = [];

    for (const s of rawSources) {
      if (s.sourceUrl?.startsWith("--")) {
        const decoded = decodeAllanimeUrl(s.sourceUrl);
        if (decoded) {
          let fullUrl = decoded;
          if (fullUrl.startsWith("//")) fullUrl = "https:" + fullUrl;
          usableSources.push({
            name: s.sourceName || "Server",
            url: fullUrl,
            priority: s.priority || 0,
          });
        }
      } else if (s.sourceUrl?.startsWith("http")) {
        usableSources.push({
          name: s.sourceName || "Server",
          url: s.sourceUrl,
          priority: s.priority || 0,
        });
      }
    }

    if (usableSources.length > 0) {
      return {
        ok: true,
        url: usableSources[0].url,
        sources: usableSources,
        translationType: dubSub,
        referer: "https://allmanga.to",
      };
    }

    return { ok: false, error: `No playable ${dubSub.toUpperCase()} streams found` };
  } catch (err) {
    return { ok: false, error: err.message || "Failed to resolve anime stream" };
  }
}
