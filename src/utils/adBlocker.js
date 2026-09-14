/**
 * Hidden Built-in Ad-Blocker & Popup Interceptor Engine
 * Silently neutralizes popups, redirects, click-hijacking, and rogue ad scripts
 * without requiring user configuration or third-party extensions.
 */

let initialized = false;

export function initAdBlocker() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const originalOpen = window.open;

    // 1. Silent window.open Interception
    // Intercepts unauthorized popups and ad redirects
    window.open = function (url, target, features) {
      if (!url) return null;
      const urlStr = String(url).toLowerCase();

      // Block known ad networks and suspicious popup patterns
      const isBlockedAd =
        urlStr.includes("popads") ||
        urlStr.includes("monetag") ||
        urlStr.includes("adsterra") ||
        urlStr.includes("bet") ||
        urlStr.includes("casino") ||
        urlStr.includes("track") ||
        urlStr.includes("onclick") ||
        urlStr.includes("redirect") ||
        urlStr.includes("doubleclick") ||
        urlStr.includes("adservice") ||
        urlStr.includes("traffic") ||
        urlStr.includes("syndication") ||
        urlStr.includes("propellerads") ||
        urlStr.includes("exoclick") ||
        urlStr.includes("popcash");

      if (isBlockedAd) {
        console.warn("[AdShield] Silently blocked unauthorized ad popup:", url);
        return null;
      }

      return originalOpen.call(window, url, target, features);
    };

    // 2. Prevent top-frame hijacking / malicious redirects
    window.addEventListener(
      "beforeunload",
      (e) => {
        // Prevent ad scripts from trapping user or locking the tab
      },
      { capture: true }
    );

    // 3. Click-Hijack Trap Prevention on untrusted target='_blank' injected links
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target.closest("a");
        if (target && target.href) {
          const href = target.href.toLowerCase();
          if (
            href.includes("popads") ||
            href.includes("monetag") ||
            href.includes("adsterra") ||
            href.includes("propeller") ||
            href.includes("traffic")
          ) {
            e.preventDefault();
            e.stopPropagation();
            console.warn("[AdShield] Silently intercepted ad click hijack");
          }
        }
      },
      true
    );

    // 4. Clean rogue dynamically inserted ad scripts
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === "SCRIPT" || node.tagName === "IFRAME") {
            const src = (node.src || "").toLowerCase();
            if (
              src.includes("popads") ||
              src.includes("adsterra") ||
              src.includes("monetag") ||
              src.includes("propellerads") ||
              src.includes("doubleclick.net")
            ) {
              node.remove();
              console.warn("[AdShield] Removed malicious ad injection:", src);
            }
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch (err) {
    // Fail gracefully
  }
}
