import { useState, useEffect, useCallback } from "react";
import { Network } from "@capacitor/network";

export default function NetworkOfflineModal({ onRetry }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionType, setConnectionType] = useState("unknown");

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      // Check native Capacitor network if available
      try {
        const status = await Network.getStatus();
        setConnectionType(status.connectionType || "none");
        if (!status.connected) {
          setIsOffline(true);
          setIsChecking(false);
          return;
        }
      } catch (e) {
        // Capacitor network fallback to web navigator
      }

      // Check browser navigator status
      if (!navigator.onLine) {
        setIsOffline(true);
        setIsChecking(false);
        return;
      }

      // Quick fetch ping test to verify actual internet connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        await fetch("https://api.themoviedb.org/3/configuration?api_key=dummy", {
          method: "HEAD",
          mode: "no-cors",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        setIsOffline(false);
        if (onRetry) onRetry();
      } catch (err) {
        // In case TMDB blocks HEAD, try a fast public CDN fallback
        try {
          await fetch("https://www.google.com/generate_204", {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-store",
          });
          setIsOffline(false);
          if (onRetry) onRetry();
        } catch {
          setIsOffline(true);
        }
      }
    } catch (e) {
      setIsOffline(!navigator.onLine);
    } finally {
      setIsChecking(false);
    }
  }, [onRetry]);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Standard window online / offline events
    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Native Capacitor Network listener
    let capNetworkListener = null;
    try {
      Network.addListener("networkStatusChange", (status) => {
        if (!status.connected) {
          setIsOffline(true);
          setConnectionType("none");
        } else {
          setConnectionType(status.connectionType);
          checkConnection();
        }
      }).then((listener) => {
        capNetworkListener = listener;
      }).catch(() => {});
    } catch (e) {}

    // Periodic heartbeat check every 15s if offline
    const interval = setInterval(() => {
      if (!navigator.onLine) {
        setIsOffline(true);
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (capNetworkListener && capNetworkListener.remove) {
        capNetworkListener.remove();
      }
      clearInterval(interval);
    };
  }, [checkConnection]);

  if (!isOffline) return null;

  return (
    <div className="redzone-offline-overlay" role="alertdialog" aria-modal="true">
      <div className="redzone-offline-backdrop" />

      <div className="redzone-offline-card redzone-liquid-glass-card">
        {/* Animated Wi-Fi Off / Radar Icon */}
        <div className="redzone-offline-icon-wrap">
          <div className="redzone-offline-icon-ring redzone-offline-icon-ring--outer" />
          <div className="redzone-offline-icon-ring redzone-offline-icon-ring--inner" />
          <div className="redzone-offline-icon-core">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e50914"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
        </div>

        {/* Offline Heading & Status */}
        <div className="redzone-offline-header">
          <span className="redzone-offline-badge">Network Disconnected</span>
          <h2 className="redzone-offline-title">Wi-Fi & Internet Disabled</h2>
          <p className="redzone-offline-desc">
            REDZONE requires an active Internet connection to stream movies, TV shows, and load streaming servers. Please connect to <strong>Wi-Fi</strong> or enable <strong>Mobile Data</strong> on your phone.
          </p>
        </div>

        {/* Diagnostic hints */}
        <div className="redzone-offline-tips">
          <div className="redzone-offline-tip-item">
            <span className="redzone-tip-bullet">1</span>
            <span>Check your phone's <strong>Wi-Fi</strong> settings or toggle Airplane mode.</span>
          </div>
          <div className="redzone-offline-tip-item">
            <span className="redzone-tip-bullet">2</span>
            <span>Ensure <strong>Mobile Data</strong> is active if Wi-Fi is unavailable.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="redzone-offline-actions">
          <button
            type="button"
            className={`redzone-offline-retry-btn redzone-liquid-glass-btn ${isChecking ? "checking" : ""}`}
            onClick={checkConnection}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <div className="redzone-mini-spinner" />
                <span>Checking Connection…</span>
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Retry Connection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
