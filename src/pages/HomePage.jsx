import { useState, useEffect, useMemo, useCallback } from "react";
import MediaCard from "../components/MediaCard";
import TrendingCarousel from "../components/TrendingCarousel";
import { PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch } from "../utils/api";
import { useRatings, getRatingForItem } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { storage } from "../utils/storage";
import { loadHomeLayout, loadHomeViewMode } from "../utils/homeLayout";

/**
 * Extract up to `count` unique, recently watched items from the user's
 * history (within the last 30 days).  Returns newest-first and dedupes
 * by TMDB id + media_type so we don't fire duplicate API calls.
 */
function getRecentHistoryItems(history, count = 5) {
  if (!history || history.length === 0) return [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = history
    .filter((h) => h.watchedAt && h.watchedAt > thirtyDaysAgo)
    .sort((a, b) => b.watchedAt - a.watchedAt);

  const seen = new Set();
  const unique = [];
  for (const item of recent) {
    const key = `${item.media_type || "movie"}_${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= count) break;
  }
  return unique;
}

export default function HomePage({
  trending,
  trendingTV,
  loading,
  onSelect,
  progress,
  inProgress,
  offline,
  onRetry,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  history,
  apiKey,
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const featuredList = useMemo(() => trending.slice(0, 5), [trending]);
  const hero = featuredList[heroIndex] || trending[0];

  useEffect(() => {
    if (featuredList.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredList.length);
    }, 8500);
    return () => clearInterval(timer);
  }, [featuredList]);

  const [recommendedItems, setRecommendedItems] = useState([]);
  const [topRatedItems, setTopRatedItems] = useState([]);

  // Load layout config (order + visibility) once on mount
  const [layout] = useState(() => loadHomeLayout());
  const { order: rowOrder, visible: rowVisible } = layout;

  const [viewMode] = useState(() => loadHomeViewMode());

  // All items for batch ratings fetch
  const allItems = useMemo(
    () => [
      ...inProgress,
      ...trending.map((i) => ({ ...i, media_type: "movie" })),
      ...trendingTV.map((i) => ({ ...i, media_type: "tv" })),
      ...recommendedItems,
      ...topRatedItems,
    ],
    [inProgress, trending, trendingTV, recommendedItems, topRatedItems],
  );

  const { ratingsMap, ageLimitSetting } = useRatings(allItems);

  const getRating = useCallback(
    (item) => getRatingForItem(item, ratingsMap),
    [ratingsMap],
  );
  const itemRestricted = useCallback(
    (item) =>
      isRestricted(getRatingForItem(item, ratingsMap).minAge, ageLimitSetting),
    [ratingsMap, ageLimitSetting],
  );

  // Enrich ratingsMap with restricted flag for carousels
  const enrichedRatingsMap = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(ratingsMap)) {
      out[k] = { ...v, restricted: isRestricted(v.minAge, ageLimitSetting) };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingsMap, ageLimitSetting]);

  // Filter recommended items that exceed age limit setting
  const filteredRecommendedItems = useMemo(() => {
    return recommendedItems.filter((item) => !itemRestricted(item));
  }, [recommendedItems, itemRestricted]);

  // Fetch personalised recommendations from multiple recent history items
  useEffect(() => {
    if (!apiKey || offline || !history || history.length === 0) return;
    const sources = getRecentHistoryItems(history, 5);
    if (sources.length === 0) return;

    const controller = new AbortController();

    // Build a Set of already-watched TMDB ids for dedup
    const watchedIds = new Set(
      (history || []).map((h) => `${h.media_type || "movie"}_${h.id}`),
    );

    // For each source, try /recommendations first, fall back to /similar
    const fetches = sources.map((source) => {
      const type = source.media_type === "tv" ? "tv" : "movie";
      return tmdbFetch(`/${type}/${source.id}/recommendations`, apiKey, {
        signal: controller.signal,
      })
        .then((data) => {
          const results = (data.results || []).map((i) => ({
            ...i,
            media_type: type,
          }));
          if (results.length > 0) return results;
          // Fall back to /similar if /recommendations returned nothing
          return tmdbFetch(`/${type}/${source.id}/similar`, apiKey, {
            signal: controller.signal,
          }).then((d) =>
            (d.results || []).map((i) => ({ ...i, media_type: type })),
          );
        })
        .catch(() => []);
    });

    Promise.all(fetches)
      .then((arrays) => {
        // Interleave results from each source for variety
        const merged = [];
        const maxLen = Math.max(...arrays.map((a) => a.length));
        for (let i = 0; i < maxLen; i++) {
          for (const arr of arrays) {
            if (arr[i]) merged.push(arr[i]);
          }
        }

        // Deduplicate and filter out already-watched items
        const seen = new Set();
        const deduped = merged.filter((item) => {
          const key = `${item.media_type}_${item.id}`;
          if (seen.has(key) || watchedIds.has(key)) return false;
          seen.add(key);
          return true;
        });

        setRecommendedItems(deduped.slice(0, 20));
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          console.warn("Recommendations fetch failed", e);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline, history?.length]);

  // Fetch top rated movies + TV, merge and shuffle
  useEffect(() => {
    if (!apiKey || offline) return;
    const controller = new AbortController();
    Promise.all([
      tmdbFetch("/movie/top_rated?page=1", apiKey, {
        signal: controller.signal,
      }),
      tmdbFetch("/tv/top_rated?page=1", apiKey, { signal: controller.signal }),
    ])
      .then(([moviesData, tvData]) => {
        const movies = (moviesData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "movie" }));
        const tv = (tvData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "tv" }));
        // Interleave movies and TV for variety
        const merged = [];
        const max = Math.max(movies.length, tv.length);
        for (let i = 0; i < max; i++) {
          if (movies[i]) merged.push(movies[i]);
          if (tv[i]) merged.push(tv[i]);
        }
        setTopRatedItems(merged);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.warn("Top rated fetch failed", e);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline]);

  // Stable pre-built item arrays for carousels, capped at 10
  const trendingMovieItems = useMemo(
    () => trending.slice(0, 10).map((i) => ({ ...i, media_type: "movie" })),
    [trending],
  );
  const trendingTVItems = useMemo(
    () => trendingTV.slice(0, 10).map((i) => ({ ...i, media_type: "tv" })),
    [trendingTV],
  );

  return (
    <div className="fade-in">
      {/* ── Offline ── */}
      {offline && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 16,
            color: "var(--text2)",
          }}
        >
          <div style={{ fontSize: 48 }}>📡</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
            No internet connection
          </div>
          <div style={{ fontSize: 14, color: "var(--text3)" }}>
            Trending and search require an internet connection. Your downloads
            and library still work offline.
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {!offline && loading && (
        <div className="loader">
          <div className="spinner" />
        </div>
      )}

      {!offline && !loading && !hero && trending.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: 14,
            padding: "48px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "rgba(255, 19, 61, 0.14)",
              border: "1px solid rgba(255, 19, 61, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "0 0 20px rgba(255, 19, 61, 0.25)",
            }}
          >
            🎬
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.5px" }}>
            Connecting to Stream Catalog...
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", maxWidth: 360, lineHeight: 1.5 }}>
            Fetching the latest trending movies and series.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700 }}
            onClick={onRetry}
          >
            Refresh Catalog
          </button>
        </div>
      )}

      {/* ── Hero (always first) ── */}
      {!loading && hero && (
        <div className="hero">
          <div
            key={hero.id}
            className="hero-bg hero-bg--animated"
            style={{
              backgroundImage: `url(${imgUrl(hero.backdrop_path, "original")})`,
            }}
          />
          <div className="hero-gradient" />
          <div className="hero-ambient-glow" />

          <div className="hero-content">
            <div className="hero-badge-row">
              <span className="hero-type">🔥 #1 STREAMING SPOTLIGHT</span>
              <span className="hero-chip">4K ULTRA HD</span>
              <span className="hero-chip">DOLBY CINEMA</span>
            </div>

            <h1 className="hero-title">{hero.title || hero.name}</h1>

            <div className="hero-meta">
              <span className="hero-rating">
                <StarIcon /> {hero.vote_average?.toFixed(1) || "8.6"}
              </span>
              <span className="hero-meta-dot">•</span>
              <span>{hero.release_date?.slice(0, 4) || hero.first_air_date?.slice(0, 4) || "2026"}</span>
              <span className="hero-meta-dot">•</span>
              <span>{hero.media_type === "tv" ? "TV Series" : "Blockbuster Movie"}</span>
            </div>

            <p className="hero-overview">{hero.overview}</p>

            <div className="hero-actions">
              <button
                className="btn btn-primary btn-hero-stream"
                onClick={() => onSelect(hero)}
              >
                <PlayIcon />
                <span>STREAM NOW</span>
              </button>
              <button
                className="btn btn-secondary btn-hero-info"
                onClick={() => onSelect(hero)}
              >
                <span>Details & Trailer</span>
              </button>
            </div>
          </div>

          {/* Hero Rail Thumbnails */}
          {featuredList.length > 1 && (
            <div className="hero-rail">
              {featuredList.map((item, idx) => (
                <button
                  key={item.id}
                  className={`hero-rail-thumb ${idx === heroIndex ? "active" : ""}`}
                  onClick={() => setHeroIndex(idx)}
                  title={item.title || item.name}
                >
                  <img
                    src={imgUrl(item.backdrop_path || item.poster_path, "w300")}
                    alt={item.title || item.name}
                  />
                  <span className="hero-rail-title">{item.title || item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Rows in user-configured order ── */}
      {rowOrder.map((id) => {
        if (!rowVisible[id]) return null;

        if (id === "continue") {
          if (inProgress.length === 0) return null;
          return (
            <div key="continue" className="section">
              <div className="section-title">Continue Watching</div>
              <div className="cards-grid">
                {inProgress.map((item) => {
                  const pk =
                    item.media_type === "movie"
                      ? `movie_${item.id}`
                      : `tv_${item.id}_s${item.season}e${item.episode}`;
                  const r = getRating(item);
                  const restr = itemRestricted(item);
                  return (
                    <MediaCard
                      key={`${item.media_type}_${item.id}`}
                      item={item}
                      onClick={() => onSelect(item)}
                      progress={progress[pk] || 0}
                      watched={watched}
                      onMarkWatched={onMarkWatched}
                      onMarkUnwatched={onMarkUnwatched}
                      ageRating={r.cert}
                      restricted={restr}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        // Render a section as a flat cards-grid (list view)
        const renderList = (key, title, titleHighlight, items) => {
          if (!items || items.length === 0) return null;
          return (
            <div key={key} className="section">
              <div className="section-title">
                {titleHighlight ? (
                  <>
                    {title}&nbsp;
                    <span style={{ color: "var(--red)" }}>
                      {titleHighlight}
                    </span>
                  </>
                ) : (
                  title
                )}
              </div>
              <div className="cards-grid">
                {items.map((item) => {
                  const type = item.media_type === "tv" ? "tv" : "movie";
                  const rk = `${type}_${item.id}`;
                  const rd = enrichedRatingsMap[rk] || {};
                  return (
                    <MediaCard
                      key={`${item.media_type}_${item.id}`}
                      item={item}
                      onClick={() => onSelect(item)}
                      progress={0}
                      watched={watched}
                      onMarkWatched={onMarkWatched}
                      onMarkUnwatched={onMarkUnwatched}
                      ageRating={rd.cert}
                      restricted={rd.restricted}
                    />
                  );
                })}
              </div>
            </div>
          );
        };

        if (id === "recommended") {
          if (filteredRecommendedItems.length === 0) return null;
          if (viewMode === "list")
            return renderList(
              "recommended",
              "Recommended for You",
              null,
              filteredRecommendedItems,
            );
          return (
            <TrendingCarousel
              key="recommended"
              items={filteredRecommendedItems}
              title="Recommended for You"
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        if (id === "trendingMovies") {
          if (trendingMovieItems.length === 0) return null;
          if (viewMode === "list")
            return renderList(
              "trendingMovies",
              "Trending Movies",
              null,
              trendingMovieItems,
            );
          return (
            <TrendingCarousel
              key="trendingMovies"
              items={trendingMovieItems}
              title="Trending Movies"
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        if (id === "trendingTV") {
          if (trendingTVItems.length === 0) return null;
          if (viewMode === "list")
            return renderList(
              "trendingTV",
              "Trending Series",
              null,
              trendingTVItems,
            );
          return (
            <TrendingCarousel
              key="trendingTV"
              items={trendingTVItems}
              title="Trending Series"
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        if (id === "topRated") {
          if (topRatedItems.length === 0) return null;
          if (viewMode === "list")
            return renderList("topRated", "Top Rated", null, topRatedItems);
          return (
            <TrendingCarousel
              key="topRated"
              items={topRatedItems}
              title="Top Rated"
              onSelect={onSelect}
              ratingsMap={enrichedRatingsMap}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
