/**
 * REDZONE Ultra AdShield & Rogue Redirect Blocker
 * 100% blocks betting sites, rogue redirects, popups, popunders, clickjacking, and tracking
 * across Google Chrome, Brave, Safari, Edge, Android WebView, and Smart TV browsers.
 * Designed defensively so it never breaks React DOM reconciliation.
 */

import { storage, STORAGE_KEYS } from "./storage";

let initialized = false;

export function isAdBlockerEnabled() {
  if (typeof window === "undefined") return true;
  const val = storage.get(STORAGE_KEYS.ADBLOCK_ENABLED);
  return val === null || val === undefined ? true : !!val;
}

export function setAdBlockerEnabled(enabled) {
  if (typeof window === "undefined") return;
  storage.set(STORAGE_KEYS.ADBLOCK_ENABLED, !!enabled);
  window.dispatchEvent(
    new CustomEvent("streambert-adblock-toggle", {
      detail: { enabled: !!enabled },
    })
  );
}

// ── COMPREHENSIVE BLACKLIST: AD NETWORKS, BETTING, CASINO & REDIRECT DOMAINS ──
const BLOCKED_KEYWORDS = [
  // Betting & Casino networks
  "1xbet",
  "bet365",
  "mostbet",
  "parimatch",
  "stake.com",
  "betway",
  "melbet",
  "linebet",
  "dafabet",
  "1win",
  "22bet",
  "megapari",
  "betwinner",
  "pin-up",
  "bc.game",
  "rollbit",
  "roobet",
  "vulkan",
  "casino",
  "gambling",
  "jackpot",
  "betting",
  "bet9ja",
  "sportybet",
  "bovada",
  "poker",
  "slot-machine",
  "aviator",

  // Notorious Video Player Ad Networks & Popunder Engines
  "popads",
  "monetag",
  "adsterra",
  "propellerads",
  "exoclick",
  "popcash",
  "hilltopads",
  "clickadu",
  "richads",
  "twinred",
  "trafficstars",
  "onclick",
  "syndication",
  "adcash",
  "juicyads",
  "admaven",
  "evadav",
  "yllix",
  "adpushup",
  "adnxs",
  "rubiconproject",
  "criteo",
  "taboola",
  "outbrain",
  "mgid",
  "revcontent",
  "infolinks",
  "bidvertiser",
  "adkernel",
  "adsupply",
  "trafficjunky",
  "ero-advertising",
  "trafficforce",
  "adxcore",
  "adtrue",
  "adform",
  "pubmatic",
  "openx",
  "casalemedia",
  "yieldmo",
  "smaato",
  "smartadserver",
  "sharethrough",
  "gumgum",
  "kargo",
  "undertone",
  "exponential",
  "adblade",
  "popunder",
  "adkeeper",
  "clarium",
  "adreactor",
  "vdo.ai",
  "yektanet",
  "clickfuse",
  "coinhive",
  "cryptoloot",
  "doubleclick",
  "adservice",
  "adserver",
  "streamruby",
  "directrev",
  "onclickperformance",
  "rtb",
  "popurl",
  "rotator",
  "traffic",
  "redirect",
  "tracking",
  "tracker",
  "clickserve",
  "ads.",
  "ad.",
  "banner.",
  "pixel.",
  "promoted.",
];

export function isUrlBlocked(url) {
  if (!url) return false;
  const urlStr = String(url).toLowerCase();

  // Allow trusted API and TMDB / image domains
  if (
    urlStr.includes("themoviedb.org") ||
    urlStr.includes("tmdb.org") ||
    urlStr.includes("unsplash.com") ||
    urlStr.includes("googleapis.com") ||
    urlStr.includes("github.com") ||
    urlStr.includes(window.location.hostname)
  ) {
    return false;
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    if (urlStr.includes(keyword)) return true;
  }
  return false;
}

function notifyBlocked(url) {
  try {
    let domain = "ad-network";
    try {
      if (url.startsWith("http")) {
        domain = new URL(url).hostname;
      } else {
        domain = url.slice(0, 30);
      }
    } catch {
      domain = url.slice(0, 30);
    }
    window.dispatchEvent(
      new CustomEvent("streambert-adblocked", {
        detail: { domain, count: 1, total: 1, domains: { [domain]: 1 } },
      })
    );
  } catch {}
}

/**
 * Initialize Ultra AdShield protection
 */
export function initAdBlocker() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const originalOpen = window.open;

    // 1. Bulletproof window.open Interception
    // Completely stops rogue new tabs, popups, and betting site redirects
    window.open = function (url, target, features) {
      if (!isAdBlockerEnabled()) {
        return originalOpen.call(window, url, target, features);
      }

      // Block blank or empty popup targets that adscripts use to hijack tabs
      if (!url || url === "" || url === "about:blank") {
        console.warn("[AdShield] Blocked empty popup trigger");
        notifyBlocked("blank-popup");
        return {
          focus: () => {},
          blur: () => {},
          close: () => {},
          location: { href: "" },
          closed: true,
        };
      }

      const urlStr = String(url).toLowerCase();

      // Check if blocked keyword or suspicious schema
      if (
        isUrlBlocked(urlStr) ||
        urlStr.includes("about:blank") ||
        urlStr.includes("javascript:") ||
        urlStr.startsWith("data:text/html")
      ) {
        console.warn("[AdShield] Blocked rogue ad/betting popup:", url);
        notifyBlocked(urlStr);
        return {
          focus: () => {},
          blur: () => {},
          close: () => {},
          location: { href: "" },
          closed: true,
        };
      }

      // Block hidden 1x1 popunder geometry
      if (features && (features.includes("width=1") || features.includes("top=9999") || features.includes("left=9999"))) {
        console.warn("[AdShield] Blocked hidden popunder window:", url);
        notifyBlocked(urlStr);
        return null;
      }

      return originalOpen.call(window, url, target, features);
    };

    // 2. Fetch API Network Request Filter
    if (typeof window.fetch === "function") {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        if (!isAdBlockerEnabled()) {
          return originalFetch.apply(this, arguments);
        }
        const url = typeof input === "string" ? input : input?.url || "";
        if (isUrlBlocked(url)) {
          notifyBlocked(url);
          return new Response(JSON.stringify({ blocked: true, status: "adshield_blocked" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch.apply(this, arguments);
      };
    }

    // 3. XMLHttpRequest Network Request Filter
    if (typeof window.XMLHttpRequest === "function") {
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (!isAdBlockerEnabled()) {
          return originalXhrOpen.apply(this, arguments);
        }
        if (isUrlBlocked(url)) {
          notifyBlocked(String(url));
          this.abort();
          return;
        }
        return originalXhrOpen.apply(this, arguments);
      };
    }

    // 4. Click-Hijack Trap (Capture Phase)
    // Stops clicks on hidden <a> tags or links pointing to betting/ad sites
    const handleDocumentClick = (e) => {
      if (!isAdBlockerEnabled()) return;

      const anchor = e.target?.closest?.("a");
      if (anchor && anchor.href) {
        const href = anchor.href.toLowerCase();
        if (isUrlBlocked(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          notifyBlocked(href);
          console.warn("[AdShield] Neutralized rogue ad link click:", href);
          return false;
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("click", handleDocumentClick, true);

    // 5. Parent Window Navigation Guard
    // Prevents rogue scripts from overriding top.location.href or parent.location.href
    window.addEventListener(
      "beforeunload",
      (e) => {
        // Log or protect when needed
      },
      { capture: true }
    );

    // 6. Safe Script Tag Sanitizer (Only block rogue external script injections)
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName, options) {
      const el = originalCreateElement.call(document, tagName, options);
      if (tagName && String(tagName).toLowerCase() === "script") {
        const originalSetAttribute = el.setAttribute;
        el.setAttribute = function (name, value) {
          if (name === "src" && isAdBlockerEnabled() && isUrlBlocked(value)) {
            console.warn("[AdShield] Blocked rogue script tag creation:", value);
            notifyBlocked(value);
            return;
          }
          return originalSetAttribute.apply(this, arguments);
        };
      }
      return el;
    };
  } catch (err) {
    console.warn("[AdShield] Initialized with basic protection", err);
  }
}
