import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { tmdbFetch, imgUrl } from "../utils/api";
import { storage } from "../utils/storage";

const STREAMING_SERVERS = [
  {
    id: "videasy",
    name: "Server 1",
    label: "Server 1",
    quality: "1080p HD",
    tag: "Ultra HD • Fast",
    getMovieUrl: (id) => `https://player.videasy.to/movie/${id}?color=e50914`,
    getTvUrl: (id, s, e) => `https://player.videasy.to/tv/${id}/${s}/${e}?color=e50914`,
  },
  {
    id: "vidlink",
    name: "Server 2",
    label: "Server 2",
    quality: "4K / Multi-Sub",
    tag: "Multi-Audio",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e50914&secondaryColor=141414`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e50914&secondaryColor=141414`,
  },
  {
    id: "autoembed",
    name: "Server 3",
    label: "Server 3",
    quality: "Auto / 1080p",
    tag: "High Speed CDN",
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc_icu",
    name: "Server 4",
    label: "Server 4",
    quality: "1080p",
    tag: "Stable Stream",
    getMovieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "smashy",
    name: "Server 5",
    label: "Server 5",
    quality: "HD Stream",
    tag: "Multi-Mirror",
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "twoembed",
    name: "Server 6",
    label: "Server 6",
    quality: "HD 720p/1080p",
    tag: "Backup Mirror",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "vidking",
    name: "Server 7",
    label: "Server 7",
    quality: "Direct HD",
    tag: "Direct Source",
    getMovieUrl: (id) => `https://www.vidking.net/embed/movie/${id}?autoPlay=true&color=e50914`,
    getTvUrl: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}?autoPlay=true&color=e50914`,
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
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [quickSettingsTab, setQuickSettingsTab] = useState("quality"); // 'quality' | 'captions'
  const [seasons, setSeasons] = useState([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscapeLocked, setIsLandscapeLocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const hideTimerRef = useRef(null);
  const serverMenuRef = useRef(null);

  // Native Default Device Fullscreen (iOS AVPlayer / Android Samsung Video Player)
  const toggleFullscreen = useCallback(() => {
    try {
      const isDocFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isDocFs) {
        // Trigger native device player fullscreen on the media iframe / element
        const targetEl = iframeRef.current || containerRef.current || document.documentElement;
        if (targetEl.requestFullscreen) {
          targetEl.requestFullscreen().catch(() => {
            if (containerRef.current?.requestFullscreen) {
              containerRef.current.requestFullscreen().catch(() => {});
            }
          });
        } else if (targetEl.webkitRequestFullscreen) {
          targetEl.webkitRequestFullscreen();
        } else if (targetEl.webkitEnterFullscreen) {
          targetEl.webkitEnterFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {}
  }, []);

  // Default Fullscreen on Load & First Interaction
  useEffect(() => {
    const triggerDefaultFullscreen = () => {
      try {
        const el = containerRef.current || document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
      } catch (e) {}
    };

    triggerDefaultFullscreen();

    const handleFirstGesture = () => {
      triggerDefaultFullscreen();
    };

    window.addEventListener("pointerdown", handleFirstGesture, { once: true });
    window.addEventListener("click", handleFirstGesture, { once: true });

    // Track standard browser fullscreen state
    const handleFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("click", handleFirstGesture);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

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

  // Auto-hide controls after 4s inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!showServerMenu && !showEpisodesDrawer) {
        setShowControls(false);
      }
    }, 4500);
  }, [showServerMenu, showEpisodesDrawer]);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  // Handle keyboard shortcuts: ESC to close, F for fullscreen, S for servers
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
      if (e.key.toLowerCase() === "s" && !e.target.closest("input, select")) {
        setShowServerMenu((prev) => !prev);
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
    window.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Mobile Screen Orientation lock/toggle
  const toggleOrientation = async () => {
    try {
      if (screen.orientation && screen.orientation.lock) {
        if (!isLandscapeLocked) {
          await screen.orientation.lock("landscape").catch(() => {});
          setIsLandscapeLocked(true);
        } else {
          await screen.orientation.unlock();
          setIsLandscapeLocked(false);
        }
      } else {
        toggleFullscreen();
      }
    } catch (e) {
      toggleFullscreen();
    }
  };

  const handleRefreshStream = () => {
    setIframeLoading(true);
    setReloadKey((prev) => prev + 1);
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

  const hasPrevEpisode = useMemo(() => {
    if (!isTV) return false;
    if (episode > 1) return true;
    return season > 1;
  }, [isTV, season, episode]);

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

  const handlePrevEpisode = () => {
    if (episode > 1) {
      setEpisode(episode - 1);
      return;
    }
    if (season > 1) {
      setSeason(season - 1);
      setEpisode(1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="redzone-direct-player redzone-liquid-viewport"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={() => {
        if (!showControls) setShowControls(true);
      }}
    >
      {/* Central Video Stream (iframe) with True Full-Bleed Fluid Fit */}
      <div className="redzone-player-stage redzone-player-stage--fullscreen">
        {iframeLoading && (
          <div className="redzone-player-spinner redzone-liquid-glass-spinner">
            <div className="redzone-spinner-ring" />
            <div className="redzone-spinner-text">Connecting to {currentServer.name}…</div>
            <div className="redzone-spinner-subtext">{currentServer.quality} • Fast Stream</div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={`${streamUrl}-${reloadKey}`}
          src={streamUrl}
          title={title}
          className="redzone-player-iframe redzone-player-iframe--fluid"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-encrypted-media"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen *"
          allowFullScreen={true}
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          onLoad={() => setIframeLoading(false)}
        />
      </div>

      {/* Floating Small Quick Option for Quality & Captions */}
      <div className="redzone-floating-quick-wrap">
        <div
          className="redzone-floating-quick-pill redzone-liquid-glass-pill"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quality Quick Button */}
          <button
            type="button"
            className={`redzone-floating-quick-btn ${showQuickSettings && quickSettingsTab === "quality" ? "active" : ""}`}
            onClick={() => {
              if (showQuickSettings && quickSettingsTab === "quality") {
                setShowQuickSettings(false);
              } else {
                setQuickSettingsTab("quality");
                setShowQuickSettings(true);
              }
            }}
            title="Change Quality / Server"
            aria-label="Quality Settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{currentServer.quality.split("/")[0].trim()}</span>
          </button>

          <span className="redzone-floating-quick-divider" />

          {/* Captions Quick Button */}
          <button
            type="button"
            className={`redzone-floating-quick-btn ${showQuickSettings && quickSettingsTab === "captions" ? "active" : ""}`}
            onClick={() => {
              if (showQuickSettings && quickSettingsTab === "captions") {
                setShowQuickSettings(false);
              } else {
                setQuickSettingsTab("captions");
                setShowQuickSettings(true);
              }
            }}
            title="Subtitles & Captions"
            aria-label="Captions Settings"
          >
            <span className="redzone-cc-icon-pill">CC</span>
            <span>Captions</span>
          </button>
        </div>

        {/* Small Floating Settings Popover */}
        {showQuickSettings && (
          <div
            className="redzone-quick-settings-popover redzone-liquid-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Tabs */}
            <div className="redzone-quick-popover-tabs">
              <button
                type="button"
                className={`redzone-quick-tab ${quickSettingsTab === "quality" ? "active" : ""}`}
                onClick={() => setQuickSettingsTab("quality")}
              >
                Quality
              </button>
              <button
                type="button"
                className={`redzone-quick-tab ${quickSettingsTab === "captions" ? "active" : ""}`}
                onClick={() => setQuickSettingsTab("captions")}
              >
                Captions (CC)
              </button>
              <button
                type="button"
                className="redzone-quick-popover-close"
                onClick={() => setShowQuickSettings(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Quality Selector Content */}
            {quickSettingsTab === "quality" && (
              <div className="redzone-quick-tab-body">
                <div className="redzone-quick-section-title">Stream Resolution:</div>
                <div className="redzone-quick-options-list">
                  {STREAMING_SERVERS.map((srv) => {
                    const isCurrent = srv.id === serverId;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        className={`redzone-quick-opt-row ${isCurrent ? "active" : ""}`}
                        onClick={() => {
                          setServerId(srv.id);
                          storage.set("redzone_preferred_server", srv.id);
                          setIframeLoading(true);
                          setShowQuickSettings(false);
                        }}
                      >
                        <span className="redzone-quick-opt-name">{srv.name}</span>
                        <span className="redzone-quick-opt-badge">{srv.quality}</span>
                        {isCurrent && <span className="redzone-quick-opt-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Captions Content */}
            {quickSettingsTab === "captions" && (
              <div className="redzone-quick-tab-body">
                <div className="redzone-quick-section-title">Subtitles / Captions:</div>
                <div className="redzone-quick-caption-banner">
                  <div className="redzone-caption-badge">Multi-Language Subtitles</div>
                  <p className="redzone-caption-desc">
                    Server 2 (VidLink) & Server 1 provide built-in subtitles in 35+ languages.
                  </p>
                </div>

                <div className="redzone-quick-options-list">
                  <button
                    type="button"
                    className={`redzone-quick-opt-row ${serverId === "vidlink" ? "active" : ""}`}
                    onClick={() => {
                      setServerId("vidlink");
                      storage.set("redzone_preferred_server", "vidlink");
                      setIframeLoading(true);
                      setShowQuickSettings(false);
                    }}
                  >
                    <span className="redzone-quick-opt-name">Server 2 (Multi-Sub)</span>
                    <span className="redzone-quick-opt-badge">40+ Languages</span>
                    {serverId === "vidlink" && <span className="redzone-quick-opt-check">✓</span>}
                  </button>

                  <button
                    type="button"
                    className={`redzone-quick-opt-row ${serverId === "videasy" ? "active" : ""}`}
                    onClick={() => {
                      setServerId("videasy");
                      storage.set("redzone_preferred_server", "videasy");
                      setIframeLoading(true);
                      setShowQuickSettings(false);
                    }}
                  >
                    <span className="redzone-quick-opt-name">Server 1 (English/Auto)</span>
                    <span className="redzone-quick-opt-badge">Auto Subs</span>
                    {serverId === "videasy" && <span className="redzone-quick-opt-check">✓</span>}
                  </button>
                </div>

                <div className="redzone-quick-tip">
                  Tip: Tap the <strong>CC</strong> icon in the player interface to turn subtitles on or off and choose language.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Liquid Glass Floating Controls Button */}
      <button
        type="button"
        className={`redzone-player-floating-trigger redzone-liquid-glass-btn ${showControls ? "hidden" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setShowControls(true);
        }}
        title="Show Player Controls & Servers"
        aria-label="Show Controls"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Controls</span>
      </button>

      {/* Top Liquid Glass Floating Header Bar */}
      <header
        className={`redzone-player-topbar redzone-liquid-glass-topbar ${showControls ? "redzone-player-topbar--visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="redzone-player-topbar-left">
          {/* Back button */}
          <button
            type="button"
            className="redzone-player-back-action redzone-liquid-glass-btn"
            onClick={onClose}
            aria-label="Back to browse"
            title="Back to REDZONE (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="redzone-player-back-text">Browse</span>
          </button>

          {/* Title and metadata */}
          <div className="redzone-player-meta">
            <div className="redzone-player-title-line">
              <span className="redzone-player-title" title={title}>{title}</span>
              {year && <span className="redzone-player-year">({year})</span>}
              <span className="redzone-quality-badge redzone-liquid-badge">{currentServer.quality}</span>
            </div>
            {isTV && (
              <div className="redzone-player-subtitle">
                Season {season} • Ep {episode}
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
              className={`redzone-player-control-btn redzone-liquid-glass-btn ${showServerMenu ? "active" : ""}`}
              onClick={() => setShowServerMenu((prev) => !prev)}
              title="Change Streaming Server & Quality"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span className="redzone-server-current-label">
                {currentServer.name}
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showServerMenu && (
              <div className="redzone-server-dropdown-menu redzone-liquid-glass-panel">
                <div className="redzone-server-menu-title">Select Server & Quality</div>
                <div className="redzone-server-menu-scroll">
                  {STREAMING_SERVERS.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      className={`redzone-server-menu-item redzone-liquid-menu-item ${srv.id === serverId ? "active" : ""}`}
                      onClick={() => {
                        setServerId(srv.id);
                        storage.set("redzone_preferred_server", srv.id);
                        setShowServerMenu(false);
                        setIframeLoading(true);
                      }}
                    >
                      <div className="redzone-server-item-left">
                        <span className="redzone-server-item-label">{srv.name}</span>
                        <span className="redzone-server-item-tag">{srv.quality} • {srv.tag}</span>
                      </div>
                      {srv.id === serverId && <span className="redzone-server-active-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Refresh/Reload stream button */}
          <button
            type="button"
            className="redzone-player-control-btn redzone-player-control-btn--icon redzone-liquid-glass-btn"
            onClick={handleRefreshStream}
            title="Reload Video Stream"
            aria-label="Reload stream"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          {/* TV Episodes Drawer Button */}
          {isTV && (
            <button
              type="button"
              className={`redzone-player-control-btn redzone-liquid-glass-btn ${showEpisodesDrawer ? "active" : ""}`}
              onClick={() => setShowEpisodesDrawer((prev) => !prev)}
              title="Episodes"
              aria-label="Episodes list"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

          {/* Screen Orientation / Auto-Rotate on Mobile */}
          <button
            type="button"
            className="redzone-player-control-btn redzone-player-control-btn--icon redzone-liquid-glass-btn redzone-phone-rotate-btn"
            onClick={toggleOrientation}
            title="Auto-Rotate / Fullscreen"
            aria-label="Rotate screen"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            className={`redzone-player-control-btn redzone-player-control-btn--icon redzone-liquid-glass-btn ${isFullscreen ? "active" : ""}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen Mode (F)"}
            aria-label="Toggle Fullscreen"
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
            className="redzone-player-control-btn redzone-player-control-btn--icon redzone-player-close-btn redzone-liquid-glass-btn"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close player"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Bottom Floating Liquid Glass Action Bar */}
      <footer
        className={`redzone-player-bottombar redzone-liquid-glass-bottombar ${showControls ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="redzone-player-bottombar-left">
          {/* Quality & Stream Specs Indicator */}
          <div className="redzone-bottom-quality-group">
            <span className="redzone-quality-pill redzone-liquid-badge">
              {currentServer.quality}
            </span>
            <div className="redzone-bottom-specs-text">
              <span className="redzone-bottom-server-title">{currentServer.name}</span>
              <span className="redzone-bottom-specs-dot">•</span>
              <span className="redzone-bottom-tag-label">{currentServer.tag}</span>
            </div>
          </div>
        </div>

        <div className="redzone-player-bottombar-right">
          {/* Previous Episode Button (TV) */}
          {isTV && hasPrevEpisode && (
            <button
              type="button"
              className="redzone-player-skip-btn redzone-liquid-glass-btn"
              onClick={handlePrevEpisode}
              title="Previous Episode"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="3" />
                <polygon points="19 20 9 12 19 4 19 20" />
              </svg>
              <span>Prev Ep</span>
            </button>
          )}

          {/* Next Episode Button (TV) */}
          {isTV && hasNextEpisode && (
            <button
              type="button"
              className="redzone-player-skip-btn redzone-player-skip-btn--primary redzone-liquid-glass-primary-btn"
              onClick={handleNextEpisode}
              title="Next Episode"
            >
              <span>Next Ep</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="3" />
              </svg>
            </button>
          )}

          {/* Direct Clean Popout */}
          <button
            type="button"
            className="redzone-player-skip-btn redzone-liquid-glass-btn"
            onClick={() => window.open(streamUrl, "_blank", "noopener,noreferrer")}
            title="Open in Clean Popout Window"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>Popout</span>
          </button>

          {/* Fullscreen Button in Bottom Bar */}
          <button
            type="button"
            className={`redzone-player-skip-btn redzone-player-fullscreen-btn redzone-liquid-glass-btn ${isFullscreen ? "active" : ""}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen Mode (F)"}
            aria-label="Fullscreen"
          >
            {isFullscreen ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* TV Episodes Side Drawer / Overlay with Liquid Glass */}
      {isTV && showEpisodesDrawer && (
        <aside
          className="redzone-episodes-drawer redzone-liquid-glass-drawer"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="redzone-drawer-header">
            <div className="redzone-drawer-title-wrap">
              <h3 className="redzone-drawer-title">Episodes</h3>
              {seasons.length > 0 && (
                <select
                  className="redzone-drawer-season-select redzone-liquid-glass-select"
                  value={season}
                  onChange={(e) => {
                    setSeason(Number(e.target.value));
                    setEpisode(1);
                  }}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {s.name} ({s.episode_count} Ep)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              className="redzone-drawer-close redzone-liquid-glass-btn"
              onClick={() => setShowEpisodesDrawer(false)}
              aria-label="Close episodes drawer"
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
                    className={`redzone-drawer-episode-row redzone-liquid-glass-row ${isCurrent ? "active" : ""}`}
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
