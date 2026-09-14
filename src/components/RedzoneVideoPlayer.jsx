import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { tmdbFetch, imgUrl } from "../utils/api";
import { storage } from "../utils/storage";

const STREAMING_SERVERS = [
  {
    id: "videasy",
    label: "Server 1 (Videasy - Sandbox Safe)",
    getMovieUrl: (id) => `https://player.videasy.to/movie/${id}?color=e50914`,
    getTvUrl: (id, s, e) => `https://player.videasy.to/tv/${id}/${s}/${e}?color=e50914`,
  },
  {
    id: "vidking",
    label: "Server 2 (Vidking - Ultra HD)",
    getMovieUrl: (id) => `https://www.vidking.net/embed/movie/${id}?autoPlay=true&color=e50914`,
    getTvUrl: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}?autoPlay=true&color=e50914`,
  },
  {
    id: "autoembed",
    label: "Server 3 (AutoEmbed)",
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidlink",
    label: "Server 4 (VidLink Pro)",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    id: "twoembed",
    label: "Server 5 (2Embed)",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "vidsrc",
    label: "Server 6 (VidSrc - Fast)",
    getMovieUrl: (id) => `https://vsembed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vsembed.su/embed/tv/${id}/${s}/${e}`,
  },
];

export default function RedzoneVideoPlayer({
  item,
  apiKey,
  initialSeason = 1,
  initialEpisode = 1,
  onClose,
  onRecordHistory,
}) {
  const isTV = item?.media_type === "tv" || (!item?.release_date && Boolean(item?.name));
  const mediaType = isTV ? "tv" : "movie";
  const itemId = item?.id;
  const title = item?.title || item?.name || "Now Playing";
  const year = (item?.release_date || item?.first_air_date || "").slice(0, 4);

  const [season, setSeason] = useState(initialSeason || 1);
  const [episode, setEpisode] = useState(initialEpisode || 1);
  const [serverId, setServerId] = useState(() => storage.get("redzone_preferred_server") || "videasy");
  const [showControls, setShowControls] = useState(true);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const serverMenuRef = useRef(null);

  // Fetch full TV details for season counts
  useEffect(() => {
    if (!isTV || !itemId || !apiKey) return;
    let mounted = true;
    tmdbFetch(`/tv/${itemId}`, apiKey)
      .then((data) => {
        if (mounted && data?.seasons) {
          const valid = data.seasons.filter((s) => s.season_number > 0);
          setSeasons(valid);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isTV, itemId, apiKey]);

  // Fetch episodes for current season
  useEffect(() => {
    if (!isTV || !itemId || !apiKey) return;
    let mounted = true;
    setLoadingEpisodes(true);
    tmdbFetch(`/tv/${itemId}/season/${season}`, apiKey)
      .then((data) => {
        if (mounted) {
          setSeasonEpisodes(data?.episodes || []);
          setLoadingEpisodes(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingEpisodes(false);
      });
    return () => {
      mounted = false;
    };
  }, [isTV, itemId, season, apiKey]);

  // Record history & progress whenever title/episode changes
  useEffect(() => {
    if (!item) return;
    const progressKey = isTV ? `tv_${itemId}_s${season}e${episode}` : `movie_${itemId}`;
    storage.set("lastWatchedKey", progressKey);

    if (onRecordHistory) {
      onRecordHistory({
        ...item,
        season: isTV ? season : undefined,
        episode: isTV ? episode : undefined,
        media_type: mediaType,
        watchedAt: Date.now(),
      });
    }
  }, [itemId, isTV, season, episode, mediaType, item, onRecordHistory]);

  // Auto-hide controls after 3.5s inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!showServerMenu && !showEpisodesDrawer) {
        setShowControls(false);
      }
    }, 3500);
  }, [showServerMenu, showEpisodesDrawer]);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  // Handle keyboard shortcuts: ESC to close, F for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showEpisodesDrawer) {
          setShowEpisodesDrawer(false);
        } else if (showServerMenu) {
          setShowServerMenu(false);
        } else {
          onClose();
        }
      }
      if (e.key.toLowerCase() === "f" && !e.target.closest("input, select")) {
        toggleFullscreen();
      }
      resetHideTimer();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showEpisodesDrawer, showServerMenu, resetHideTimer]);

  // Click outside server menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(e.target)) {
        setShowServerMenu(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentServer = useMemo(() => {
    return STREAMING_SERVERS.find((s) => s.id === serverId) || STREAMING_SERVERS[0];
  }, [serverId]);

  const streamUrl = useMemo(() => {
    if (!itemId) return "";
    setIframeLoading(true);
    if (isTV) {
      return currentServer.getTvUrl(itemId, season, episode);
    }
    return currentServer.getMovieUrl(itemId);
  }, [currentServer, itemId, isTV, season, episode]);

  const currentEpisodeObj = useMemo(() => {
    return seasonEpisodes.find((e) => e.episode_number === episode);
  }, [seasonEpisodes, episode]);

  const hasNextEpisode = useMemo(() => {
    if (!isTV) return false;
    const currentIndex = seasonEpisodes.findIndex((e) => e.episode_number === episode);
    if (currentIndex >= 0 && currentIndex < seasonEpisodes.length - 1) return true;
    const currentSeasonIdx = seasons.findIndex((s) => s.season_number === season);
    return currentSeasonIdx >= 0 && currentSeasonIdx < seasons.length - 1;
  }, [isTV, seasonEpisodes, episode, seasons, season]);

  const handleNextEpisode = () => {
    const currentIndex = seasonEpisodes.findIndex((e) => e.episode_number === episode);
    if (currentIndex >= 0 && currentIndex < seasonEpisodes.length - 1) {
      setEpisode(seasonEpisodes[currentIndex + 1].episode_number);
      return;
    }
    const currentSeasonIdx = seasons.findIndex((s) => s.season_number === season);
    if (currentSeasonIdx >= 0 && currentSeasonIdx < seasons.length - 1) {
      const nextSeasonNum = seasons[currentSeasonIdx + 1].season_number;
      setSeason(nextSeasonNum);
      setEpisode(1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="redzone-direct-player"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={() => {
        if (!showControls) setShowControls(true);
      }}
    >
      {/* Central Video Stream (iframe) */}
      <div className="redzone-player-stage">
        {iframeLoading && (
          <div className="redzone-player-spinner">
            <div className="redzone-spinner-ring" />
            <div className="redzone-spinner-text">Connecting to {currentServer.label}…</div>
          </div>
        )}

        <iframe
          key={streamUrl}
          src={streamUrl}
          title={title}
          className="redzone-player-iframe"
          referrerPolicy="no-referrer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          onLoad={() => setIframeLoading(false)}
        />
      </div>

      {/* Top Floating Control Bar */}
      <header
        className={`redzone-player-topbar ${showControls ? "redzone-player-topbar--visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="redzone-player-topbar-left">
          {/* Back button */}
          <button
            type="button"
            className="redzone-player-back-action"
            onClick={onClose}
            aria-label="Back to browse"
            title="Back to REDZONE (Esc)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="redzone-player-back-text">Browse</span>
          </button>

          {/* Title and metadata */}
          <div className="redzone-player-meta">
            <div className="redzone-player-title-line">
              <span className="redzone-player-title">{title}</span>
              {year && <span className="redzone-player-year">({year})</span>}
            </div>
            {isTV && (
              <div className="redzone-player-subtitle">
                Season {season} • Episode {episode}
                {currentEpisodeObj?.name ? `: ${currentEpisodeObj.name}` : ""}
              </div>
            )}
          </div>
        </div>

        <div className="redzone-player-topbar-right">
          {/* Server Switcher Dropdown */}
          <div className="redzone-server-dropdown-wrap" ref={serverMenuRef}>
            <button
              type="button"
              className="redzone-player-control-btn"
              onClick={() => setShowServerMenu((prev) => !prev)}
              title="Change Streaming Server"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span className="redzone-server-current-label">
                {currentServer.label.split(" ")[1] || "Server"}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showServerMenu && (
              <div className="redzone-server-dropdown-menu">
                <div className="redzone-server-menu-title">Select Playback Server</div>
                {STREAMING_SERVERS.map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    className={`redzone-server-menu-item ${srv.id === serverId ? "active" : ""}`}
                    onClick={() => {
                      setServerId(srv.id);
                      storage.set("redzone_preferred_server", srv.id);
                      setShowServerMenu(false);
                      setIframeLoading(true);
                    }}
                  >
                    <span>{srv.label}</span>
                    {srv.id === serverId && <span className="redzone-server-active-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TV Episodes Drawer Button */}
          {isTV && (
            <button
              type="button"
              className={`redzone-player-control-btn ${showEpisodesDrawer ? "active" : ""}`}
              onClick={() => setShowEpisodesDrawer((prev) => !prev)}
              title="Episodes"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span className="redzone-control-label">Episodes</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            className="redzone-player-control-btn redzone-player-control-btn--icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>

          {/* Close X Button */}
          <button
            type="button"
            className="redzone-player-control-btn redzone-player-control-btn--icon redzone-player-close-btn"
            onClick={onClose}
            title="Close (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Floating Next Episode Action */}
      {isTV && hasNextEpisode && (
        <div
          className={`redzone-player-next-ep-wrap ${showControls ? "visible" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="redzone-player-next-ep-btn"
            onClick={handleNextEpisode}
            title="Play Next Episode"
          >
            <span>Next Episode</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="3" />
            </svg>
          </button>
        </div>
      )}

      {/* TV Episodes Side Drawer / Overlay */}
      {isTV && showEpisodesDrawer && (
        <aside
          className="redzone-episodes-drawer"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="redzone-drawer-header">
            <div className="redzone-drawer-title-wrap">
              <h3 className="redzone-drawer-title">Episodes</h3>
              {seasons.length > 0 && (
                <select
                  className="redzone-drawer-season-select"
                  value={season}
                  onChange={(e) => {
                    setSeason(Number(e.target.value));
                    setEpisode(1);
                  }}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {s.name} ({s.episode_count} Episodes)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              className="redzone-drawer-close"
              onClick={() => setShowEpisodesDrawer(false)}
            >
              ✕
            </button>
          </div>

          <div className="redzone-drawer-list">
            {loadingEpisodes ? (
              <div className="redzone-drawer-loading">Loading episodes…</div>
            ) : seasonEpisodes.length === 0 ? (
              <div className="redzone-drawer-loading">No episodes found.</div>
            ) : (
              seasonEpisodes.map((ep) => {
                const isCurrent = ep.episode_number === episode;
                return (
                  <div
                    key={ep.id}
                    className={`redzone-drawer-episode-row ${isCurrent ? "active" : ""}`}
                    onClick={() => {
                      setEpisode(ep.episode_number);
                      setShowEpisodesDrawer(false);
                      setIframeLoading(true);
                    }}
                  >
                    <div className="redzone-drawer-ep-thumb-wrap">
                      <img
                        src={imgUrl(ep.still_path, "w300") || imgUrl(item?.backdrop_path, "w300")}
                        alt={ep.name}
                        className="redzone-drawer-ep-thumb"
                        loading="lazy"
                      />
                      <div className="redzone-drawer-ep-overlay">
                        {isCurrent ? (
                          <div className="redzone-playing-bars">
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="redzone-drawer-ep-meta">
                      <div className="redzone-drawer-ep-top">
                        <span className="redzone-drawer-ep-num">
                          {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                        </span>
                        {ep.runtime ? (
                          <span className="redzone-drawer-ep-time">{ep.runtime}m</span>
                        ) : null}
                      </div>
                      <p className="redzone-drawer-ep-desc">
                        {ep.overview || "No description available."}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
