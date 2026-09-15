/**
 * Hidden Built-in Ad-Blocker & Popup Interceptor Engine (AdShield Pro)
 * Silently neutralizes popups, redirects, click-hijacking, tracking, and rogue ad scripts
 * on Google Chrome, Brave, Safari, Edge, and Android WebView without requiring third-party extensions.
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

// Comprehensive blocklist of rogue ad networks, popunder triggers, and tracking domains
const BLOCKED_DOMAINS = [
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
  "doubleclick",
  "adservice",
  "adserver",
  "syndication",
  "bet365",
  "1xbet",
  "mostbet",
  "parimatch",
  "stake.com",
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
];

export const PLAYER_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-presentation allow-encrypted-media";

function isUrlBlocked(url) {
  if (!url) return false;
  const urlStr = String(url).toLowerCase();
  for (const domain of BLOCKED_DOMAINS) {
    if (urlStr.includes(domain)) return true;
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

export function initAdBlocker() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const originalOpen = window.open;

    // 1. Strict window.open Interception
    // Completely neutralizes popunders, rogue tabs, and redirect cascades
    window.open = function (url, target, features) {
      if (!isAdBlockerEnabled()) {
        return originalOpen.call(window, url, target, features);
      }
      if (!url) {
        notifyBlocked("blank-popup");
        return null;
      }
      const urlStr = String(url).toLowerCase();

      // Check if blocked or suspicious
      if (
        isUrlBlocked(urlStr) ||
        urlStr.includes("about:blank") ||
        urlStr.includes("javascript:") ||
        urlStr.startsWith("data:text/html")
      ) {
        console.warn("[AdShield] Blocked unauthorized ad popup:", url);
        notifyBlocked(urlStr);
        return null;
      }

      // If called programmatically without explicit user gesture or with weird features
      if (features && (features.includes("width=1") || features.includes("top=9999"))) {
        notifyBlocked(urlStr);
        return null;
      }

      return originalOpen.call(window, url, target, features);
    };

    // 2. Fetch API Network Interception
    if (typeof window.fetch === "function") {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        if (!isAdBlockerEnabled()) {
          return originalFetch.apply(this, arguments);
        }
        const url = typeof input === "string" ? input : input?.url || "";
        if (isUrlBlocked(url)) {
          notifyBlocked(url);
          return new Response(JSON.stringify({ blocked: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch.apply(this, arguments);
      };
    }

    // 3. XMLHttpRequest Network Interception
    if (typeof window.XMLHttpRequest === "function") {
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url) {
        if (!isAdBlockerEnabled()) {
          return originalXhrOpen.apply(this, arguments);
        }
        if (isUrlBlocked(url)) {
          notifyBlocked(String(url));
          // Neutralize with noop
          this.abort();
          return;
        }
        return originalXhrOpen.apply(this, arguments);
      };
    }

    // 4. Click-Hijack Trap & Invisible Overlay Prevention
    document.addEventListener(
      "click",
      (e) => {
        if (!isAdBlockerEnabled()) return;
        const target = e.target?.closest?.("a");
        if (target && target.href) {
          const href = target.href.toLowerCase();
          if (isUrlBlocked(href)) {
            e.preventDefault();
            e.stopPropagation();
            target.remove();
            notifyBlocked(href);
            console.warn("[AdShield] Neutralized click-jack link:", href);
          }
        }
      },
      true
    );

    // 5. Clean rogue dynamically inserted ad scripts & overlay elements
    const observer = new MutationObserver((mutations) => {
      if (!isAdBlockerEnabled()) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!node || node.nodeType !== 1) continue;

          // Check SCRIPT / IFRAME tags
          if (node.tagName === "SCRIPT" || node.tagName === "IFRAME") {
            const src = (node.src || "").toLowerCase();
            if (isUrlBlocked(src)) {
              node.remove();
              notifyBlocked(src);
              console.warn("[AdShield] Removed rogue ad element:", src);
            }
          }

          // Check for transparent full-screen clickjack overlays
          if (node.tagName === "DIV" || node.tagName === "A") {
            const style = window.getComputedStyle?.(node);
            if (style) {
              const isFixed = style.position === "fixed" || style.position === "absolute";
              const isFull =
                (node.offsetWidth >= window.innerWidth * 0.8 &&
                  node.offsetHeight >= window.innerHeight * 0.8) ||
                style.width === "100vw" ||
                style.width === "100%";
              const isTransparent =
                style.opacity === "0" ||
                style.backgroundColor === "transparent" ||
                style.backgroundColor === "rgba(0, 0, 0, 0)";
              const isHighZ = parseInt(style.zIndex, 10) > 999;

              if (isFixed && isFull && isTransparent && isHighZ && !node.classList.contains("modal-overlay")) {
                node.remove();
                notifyBlocked("clickjack-overlay");
              }
            }
          }
        }
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  } catch (err) {
    // Fail gracefully
  }
}

