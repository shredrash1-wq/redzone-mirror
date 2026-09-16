import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { tmdbFetch, imgUrl } from "../utils/api";
import { storage } from "../utils/storage";

export const DUBBED_AUDIO_OPTIONS = [
  {
    id: "default",
    label: "Original",
    subLabel: "Original Studio Audio / Sub",
    flag: "🌐",
    code: "default",
    preferredServer: "videasy",
  },
  {
    id: "english",
    label: "English Dub",
    subLabel: "English Audio Track",
    flag: "🇺🇸",
    code: "en",
    preferredServer: "videasy",
  },
  {
    id: "hindi",
    label: "Hindi Dub",
    subLabel: "हिंदी डब • Hindi Audio Track",
    flag: "🇮🇳",
    code: "hi",
    preferredServer: "autoembed",
  },
];

const STREAMING_SERVERS = [
  {
    id: "videasy",
    name: "Server 1 (Fast HD)",
    label: "Server 1",
    quality: "1080p HD",
    tag: "Ultra HD • Fast",
    supportsDub: true,
    getMovieUrl: (id, langCode) => {
      let url = `https://player.videasy.to/movie/${id}?color=e50914`;
      if (langCode && langCode !== "default") {
        url += `&lang=${langCode}&audio=${langCode}&dub=1`;
      }
      return url;
    },
    getTvUrl: (id, s, e, langCode) => {
      let url = `https://player.videasy.to/tv/${id}/${s}/${e}?color=e50914`;
      if (langCode && langCode !== "default") {
        url += `&lang=${langCode}&audio=${langCode}&dub=1`;
      }
      return url;
    },
  },
  {
    id: "vidlink",
    name: "Server 2 (Multi-Sub)",
    label: "Server 2",
    quality: "4K / Multi-Audio",
    tag: "Multi-Audio • Dual Track",
    supportsDub: true,
    getMovieUrl: (id, langCode) => {
      let url = `https://vidlink.pro/movie/${id}?primaryColor=e50914&secondaryColor=141414&multiLang=1`;
      if (langCode && langCode !== "default") {
        url += `&dub=1&audio_lang=${langCode}&sub_lang=${langCode}`;
      }
      return url;
    },
    getTvUrl: (id, s, e, langCode) => {
      let url = `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=e50914&secondaryColor=141414&multiLang=1`;
      if (langCode && langCode !== "default") {
        url += `&dub=1&audio_lang=${langCode}&sub_lang=${langCode}`;
      }
      return url;
    },
  },
  {
    id: "autoembed",
    name: "Server 3 (AutoEmbed - Hindi)",
    label: "Server 3",
    quality: "1080p Dubbed",
    tag: "Hindi / Eng Dubbed",
    supportsDub: true,
    isDubbedPrimary: true,
    getMovieUrl: (id, langCode) => {
      const code = langCode && langCode !== "default" ? langCode : "hi";
      return `https://player.autoembed.cc/embed/movie/${id}?lang=${code}&dub=1`;
    },
    getTvUrl: (id, s, e, langCode) => {
      const code = langCode && langCode !== "default" ? langCode : "hi";
      return `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}?lang=${code}&dub=1`;
    },
  },
  {
    id: "multiembed",
    name: "Server 4 (MultiEmbed - Hindi)",
    label: "Server 4",
    quality: "HD Multi-Audio",
    tag: "Hindi Dubbed Server",
    supportsDub: true,
    isHindiPrimary: true,
    getMovieUrl: (id, langCode, imdbId) => {
      const vid = imdbId || id;
      let url = `https://multiembed.mov/?video_id=${vid}${!imdbId ? "&tmdb=1" : ""}`;
      if (langCode === "hi" || langCode === "hindi") {
        url += `&server=hindi&lang=hi&dub=1`;
      }
      return url;
    },
    getTvUrl: (id, s, e, langCode, imdbId) => {
      const vid = imdbId || id;
      let url = `https://multiembed.mov/?video_id=${vid}${!imdbId ? "&tmdb=1" : ""}&s=${s}&e=${e}`;
      if (langCode === "hi" || langCode === "hindi") {
        url += `&server=hindi&lang=hi&dub=1`;
      }
      return url;
    },
  },
  {
    id: "smashy",
    name: "Server 5 (SmashyStream)",
    label: "Server 5",
    quality: "HD Dual Audio",
    tag: "Multi-Audio Mirror",
    supportsDub: true,
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
];

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function RedzoneVideoPlayer({
  item,
  apiKey,
  initialSeason = 1,
  initialEpisode = 1,
  initialTime = 0,
  onClose,
  onRecordHistory,
  onSaveProgress,
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
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [audioLang, setAudioLang] = useState(() => storage.get("redzone_preferred_audio_lang") || "default");
  const [audioToast, setAudioToast] = useState(null);
  const audioToastTimerRef = useRef(null);
  const [seasons, setSeasons] = useState([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscapeLocked, setIsLandscapeLocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [imdbId, setImdbId] = useState(() => item?.imdb_id || null);

  // Fetch IMDb external ID for reliable MultiEmbed/Smashy routing
  useEffect(() => {
    if (!itemId || !apiKey || imdbId) return;
    let mounted = true;
    const endpoint = isTV ? `/tv/${itemId}/external_ids` : `/movie/${itemId}/external_ids`;
    tmdbFetch(endpoint, apiKey)
      .then((data) => {
        if (mounted && data?.imdb_id) {
          setImdbId(data.imdb_id);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isTV, itemId, apiKey, imdbId]);

  const currentAudioOption = useMemo(() => {
    return DUBBED_AUDIO_OPTIONS.find((a) => a.id === audioLang) || DUBBED_AUDIO_OPTIONS[0];
  }, [audioLang]);

  const handleSelectAudioLang = (opt) => {
    setAudioLang(opt.id);
    storage.set("redzone_preferred_audio_lang", opt.id);
    setIframeLoading(true);

    // Auto-switch to dedicated working server for dubbed audio
    if (opt.id === "hindi") {
      const targetServer = (serverId === "autoembed" || serverId === "multiembed" || serverId === "smashy") ? serverId : "autoembed";
      setServerId(targetServer);
      storage.set("redzone_preferred_server", targetServer);
    } else if (opt.id === "english") {
      if (serverId === "multiembed") {
        setServerId("videasy");
        storage.set("redzone_preferred_server", "videasy");
      }
    } else if (opt.id === "default") {
      if (serverId === "multiembed") {
        setServerId("videasy");
        storage.set("redzone_preferred_server", "videasy");
      }
    }

    setAudioToast({
      title: opt.label,
      desc: opt.id === "hindi" ? "🇮🇳 Hindi Dubbed Track Active" : opt.id === "english" ? "🇺🇸 English Dubbed Track Active" : "🌐 Original Studio Audio Active",
      flag: opt.flag,
    });
    clearTimeout(audioToastTimerRef.current);
    audioToastTimerRef.current = setTimeout(() => {
      setAudioToast(null);
    }, 3500);
  };

  // ── Playback Progress & Exact Minute/Second Tracking ──
  const progressKey = useMemo(() => {
    return isTV ? `tv_${itemId}_s${season}e${episode}` : `movie_${itemId}`;
  }, [isTV, itemId, season, episode]);

  const defaultDuration = useMemo(() => {
    if (isTV) {
      return 45 * 60; // 45m default for TV episode
    }
    return (item?.runtime ? item.runtime * 60 : 110 * 60); // Default 110m for movie
  }, [isTV, item]);

  const [duration, setDuration] = useState(defaultDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [resumeToast, setResumeToast] = useState(null); // { time: number }
  const [startOffset, setStartOffset] = useState(0);

  const currentTimeRef = useRef(0);
  const durationRef = useRef(defaultDuration);
  const itemRef = useRef(item);
  itemRef.current = item;

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const hideTimerRef = useRef(null);
  const serverMenuRef = useRef(null);
  const audioMenuRef = useRef(null);
  const toastTimerRef = useRef(null);

  // Read saved progress on mount or episode change
  useEffect(() => {
    if (!itemId) return;
    const allPositions = storage.get("playback_positions") || {};
    const pos = allPositions[progressKey];
    let initialSec = 0;

    if (pos && typeof pos.currentTime === "number" && pos.currentTime > 5) {
      initialSec = pos.currentTime;
      if (pos.duration) {
        setDuration(pos.duration);
        durationRef.current = pos.duration;
      }
    } else {
      const allProgress = storage.get("progress") || {};
      const savedPct = allProgress[progressKey];
      if (savedPct && savedPct > 1 && savedPct < 95) {
        initialSec = Math.round((savedPct / 100) * defaultDuration);
      } else if (initialTime > 5) {
        initialSec = initialTime;
      }
    }

    if (initialSec > 10) {
      setCurrentTime(initialSec);
      currentTimeRef.current = initialSec;
      setStartOffset(initialSec);
      setResumeToast({ time: initialSec });

      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setResumeToast(null);
      }, 7000);
    } else {
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setStartOffset(0);
      setResumeToast(null);
    }

    return () => clearTimeout(toastTimerRef.current);
  }, [progressKey, itemId, defaultDuration, initialTime]);

  // Flush and persist current playback position
  const flushProgress = useCallback((explicitTime = null) => {
    if (!itemId) return;
    const timeToSave = explicitTime !== null ? explicitTime : currentTimeRef.current;
    const durToSave = durationRef.current || defaultDuration;
    if (durToSave <= 0) return;

    const pct = Math.min(100, Math.max(1, Math.round((timeToSave / durToSave) * 100)));

    // 1. Save detailed position object
    const allPositions = storage.get("playback_positions") || {};
    allPositions[progressKey] = {
      id: itemId,
      media_type: isTV ? "tv" : "movie",
      season: isTV ? season : undefined,
      episode: isTV ? episode : undefined,
      title: itemRef.current?.title || itemRef.current?.name,
      poster_path: itemRef.current?.poster_path,
      backdrop_path: itemRef.current?.backdrop_path,
      currentTime: timeToSave,
      duration: durToSave,
      pct,
      updatedAt: Date.now(),
    };
    storage.set("playback_positions", allPositions);

    // 2. Save quick progress map percentage
    const allProgress = storage.get("progress") || {};
    allProgress[progressKey] = pct;
    storage.set("progress", allProgress);
    onSaveProgress?.(progressKey, pct);

    // 3. Save to watch history
    if (onRecordHistory && itemRef.current) {
      onRecordHistory({
        ...itemRef.current,
        season: isTV ? season : undefined,
        episode: isTV ? episode : undefined,
        media_type: isTV ? "tv" : "movie",
        watchedAt: Date.now(),
        progress: pct,
        currentTime: timeToSave,
        duration: durToSave,
      });
    }
  }, [itemId, defaultDuration, progressKey, isTV, season, episode, onSaveProgress, onRecordHistory]);

  // Active playback ticker (ticks every second when window active & tab visible)
  useEffect(() => {
    let tickCount = 0;
    const interval = setInterval(() => {
      if (document.hidden) return;
      currentTimeRef.current += 1;
      setCurrentTime(currentTimeRef.current);
      tickCount += 1;

      // Save to storage every 3 seconds
      if (tickCount % 3 === 0) {
        flushProgress();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      flushProgress();
    };
  }, [flushProgress]);

  // Listen to postMessage from embedded players (Vidlink, Videasy, PlayerJS, etc.)
  useEffect(() => {
    const handlePlayerMessage = (e) => {
      try {
        const raw = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!raw) return;

        const time =
          raw.currentTime ??
          raw.time ??
          raw.data?.currentTime ??
          raw.data?.time ??
          (raw.event === "timeupdate" ? raw.currentTime : null);

        const dur =
          raw.duration ??
          raw.data?.duration ??
          (raw.event === "timeupdate" ? raw.duration : null);

        if (typeof time === "number" && !isNaN(time) && time >= 0) {
          currentTimeRef.current = Math.floor(time);
          setCurrentTime(Math.floor(time));
        }
        if (typeof dur === "number" && !isNaN(dur) && dur > 60) {
          durationRef.current = Math.floor(dur);
          setDuration(Math.floor(dur));
        }
      } catch {}
    };

    window.addEventListener("message", handlePlayerMessage);
    return () => window.removeEventListener("message", handlePlayerMessage);
  }, []);

  // Handle restarting from beginning (00:00)
  const handleRestartFromBeginning = () => {
    currentTimeRef.current = 0;
    setCurrentTime(0);
    setStartOffset(0);
    setResumeToast(null);
    flushProgress(0);
    setReloadKey((prev) => prev + 1);
  };

  // Handle manual progress scrub
  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = Math.round(ratio * (durationRef.current || defaultDuration));
    currentTimeRef.current = newTime;
    setCurrentTime(newTime);
    setStartOffset(newTime);
    flushProgress(newTime);
  };

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

  // Auto-hide controls after 4.5s inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!showServerMenu && !showAudioMenu && !showEpisodesDrawer) {
        setShowControls(false);
      }
    }, 4500);
  }, [showServerMenu, showAudioMenu, showEpisodesDrawer]);

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
        } else if (showAudioMenu) {
          setShowAudioMenu(false);
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
  }, [onClose, showEpisodesDrawer, showServerMenu, showAudioMenu, resetHideTimer]);

  // Click outside server menu or audio menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(e.target)) {
        setShowServerMenu(false);
      }
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target)) {
        setShowAudioMenu(false);
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
    const langCode = currentAudioOption.code;
    let base = isTV
      ? currentServer.getTvUrl(itemId, season, episode, langCode, imdbId)
      : currentServer.getMovieUrl(itemId, langCode, imdbId);

    // If Dubbed / Audio language is active, ensure proper dub parameters are in the query string
    if (audioLang !== "default") {
      if (audioLang === "hindi") {
        if (serverId === "multiembed") {
          if (!base.includes("server=hindi")) base += `${base.includes("?") ? "&" : "?"}server=hindi&lang=hi`;
        } else if (serverId === "autoembed") {
          if (!base.includes("lang=hi")) base += `${base.includes("?") ? "&" : "?"}lang=hi&dub=1`;
        } else if (serverId === "videasy" || serverId === "vidlink") {
          if (!base.includes("lang=")) base += `${base.includes("?") ? "&" : "?"}lang=hi&audio=hi&dub=1`;
        }
      } else if (audioLang === "english") {
        if (serverId === "autoembed") {
          if (!base.includes("lang=en")) base += `${base.includes("?") ? "&" : "?"}lang=en&dub=1`;
        } else if (serverId === "videasy" || serverId === "vidlink") {
          if (!base.includes("dub=")) base += `${base.includes("?") ? "&" : "?"}lang=en&audio=en&dub=1`;
        }
      }
    }

    // If we have a saved resume position > 10 seconds, append start query for supported providers
    if (startOffset > 10) {
      const sec = Math.floor(startOffset);
      if (base.includes("videasy.net") || base.includes("videasy.to") || base.includes("vidlink.pro") || base.includes("embed.su")) {
        base += `${base.includes("?") ? "&" : "?"}start=${sec}`;
      } else if (base.includes("autoembed.cc") || base.includes("vidsrc")) {
        base += `${base.includes("?") ? "&" : "?"}t=${sec}`;
      }
    }
    return base;
  }, [currentServer, itemId, isTV, season, episode, startOffset, currentAudioOption, audioLang, imdbId, serverId]);

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

        {/* Resume Playback Toast Notification */}
        {resumeToast && (
          <div className="redzone-resume-toast" onClick={(e) => e.stopPropagation()}>
            <div className="redzone-resume-toast-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div className="redzone-resume-toast-text">
              <span>Resumed at</span>
              <span className="redzone-resume-toast-highlight">{formatTime(resumeToast.time)}</span>
            </div>
            <button
              type="button"
              className="redzone-resume-restart-btn"
              onClick={handleRestartFromBeginning}
              title="Restart from beginning"
            >
              Start from beginning
            </button>
            <button
              type="button"
              className="redzone-resume-toast-close"
              onClick={() => setResumeToast(null)}
              aria-label="Dismiss resume notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Audio / Dubbed Language Toast Notification */}
        {audioToast && (
          <div className="redzone-audio-toast" onClick={(e) => e.stopPropagation()}>
            <div className="redzone-audio-toast-flag">{audioToast.flag}</div>
            <div className="redzone-audio-toast-body">
              <div className="redzone-audio-toast-title">
                Audio: <span>{audioToast.title}</span>
              </div>
              <div className="redzone-audio-toast-desc">{audioToast.desc}</div>
            </div>
            <button
              type="button"
              className="redzone-resume-toast-close"
              onClick={() => setAudioToast(null)}
              aria-label="Dismiss audio notice"
            >
              ✕
            </button>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={`${streamUrl}-${reloadKey}`}
          src={streamUrl}
          title={title}
          className="redzone-player-iframe redzone-player-iframe--fluid"
          referrerPolicy="no-referrer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen *"
          allowFullScreen={true}
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          onLoad={() => setIframeLoading(false)}
        />
      </div>

      {/* Floating Trigger to restore controls if hidden */}
      <button
        type="button"
        className={`redzone-player-floating-trigger redzone-liquid-glass-btn ${showControls ? "hidden" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setShowControls(true);
        }}
        title="Show Controls"
        aria-label="Show Controls"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Controls</span>
      </button>

      {/* Top Header Bar - Clean and streamlined without overflowing menus */}
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
          {/* Reload stream button */}
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

          {/* TV Episodes Drawer Button (if TV) */}
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

          {/* Screen Orientation on Mobile */}
          <button
            type="button"
            className="redzone-player-control-btn redzone-player-control-btn--icon redzone-liquid-glass-btn redzone-phone-rotate-btn"
            onClick={toggleOrientation}
            title="Auto-Rotate"
            aria-label="Rotate screen"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </button>

          {/* Close button */}
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

      {/* Bottom Floating Control Bar - Only 1-2 useful options in down */}
      <footer
        className={`redzone-player-bottombar redzone-liquid-glass-bottombar ${showControls ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Scrub Progress Bar */}
        <div
          className="redzone-player-progress-container"
          onClick={handleScrub}
          title={`Seek: ${formatTime(currentTime)} / ${formatTime(duration)}`}
        >
          <div className="redzone-player-progress-track">
            <div
              className="redzone-player-progress-fill"
              style={{
                width: `${Math.min(100, Math.max(0, duration > 0 ? (currentTime / duration) * 100 : 0))}%`,
              }}
            />
            <div
              className="redzone-player-progress-thumb"
              style={{
                left: `${Math.min(100, Math.max(0, duration > 0 ? (currentTime / duration) * 100 : 0))}%`,
              }}
            />
          </div>
        </div>

        <div className="redzone-player-bottombar-left">
          {/* Time readout */}
          <div className="redzone-player-time-display">
            <span className="redzone-player-time-current">{formatTime(currentTime)}</span>
            <span className="redzone-player-time-sep">/</span>
            <span className="redzone-player-time-total">{formatTime(duration)}</span>
          </div>

          {/* Option 1: Dubbed Audio Selection (Original, Hindi, English only) */}
          <div className="redzone-bottom-menu-wrap" ref={audioMenuRef}>
            <button
              type="button"
              className={`redzone-player-skip-btn redzone-liquid-glass-btn ${showAudioMenu ? "active" : ""} ${audioLang !== "default" ? "redzone-audio-active-glow" : ""}`}
              onClick={() => {
                setShowServerMenu(false);
                setShowAudioMenu((prev) => !prev);
              }}
              title="Select Audio Track (Original, Hindi, English)"
              aria-label="Dubbed Audio"
            >
              <span style={{ fontSize: "14px" }}>{currentAudioOption.flag}</span>
              <span className="redzone-btn-text-hide-mobile">
                {audioLang === "hindi" ? "Hindi Dub" : audioLang === "english" ? "English Dub" : "Original"}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAudioMenu && (
              <div className="redzone-bottom-popover-menu redzone-liquid-glass-panel">
                <div className="redzone-bottom-popover-title">
                  <span>Audio Track (3 Options)</span>
                  <button
                    type="button"
                    className="redzone-bottom-popover-close"
                    onClick={() => setShowAudioMenu(false)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="redzone-bottom-popover-list">
                  {DUBBED_AUDIO_OPTIONS.map((opt) => {
                    const isCurrent = opt.id === audioLang;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`redzone-bottom-popover-item ${isCurrent ? "active" : ""}`}
                        onClick={() => {
                          handleSelectAudioLang(opt);
                          setShowAudioMenu(false);
                        }}
                      >
                        <div className="redzone-popover-item-left">
                          <span style={{ fontSize: "18px" }}>{opt.flag}</span>
                          <div>
                            <div className="redzone-popover-item-label">{opt.label}</div>
                            <div className="redzone-popover-item-sub">{opt.subLabel}</div>
                          </div>
                        </div>
                        {isCurrent && <span className="redzone-popover-check">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* If Hindi dub is chosen, quick 1-tap working mirrors */}
                {audioLang === "hindi" && (
                  <div className="redzone-hindi-quick-mirrors">
                    <div className="redzone-hindi-mirrors-title">⚡ Hindi Stream Mirror:</div>
                    <div className="redzone-hindi-mirrors-grid">
                      <button
                        type="button"
                        className={`redzone-hindi-mirror-btn ${serverId === "autoembed" ? "active" : ""}`}
                        onClick={() => {
                          setServerId("autoembed");
                          storage.set("redzone_preferred_server", "autoembed");
                          setIframeLoading(true);
                          setShowAudioMenu(false);
                        }}
                      >
                        AutoEmbed (Fast)
                      </button>
                      <button
                        type="button"
                        className={`redzone-hindi-mirror-btn ${serverId === "multiembed" ? "active" : ""}`}
                        onClick={() => {
                          setServerId("multiembed");
                          storage.set("redzone_preferred_server", "multiembed");
                          setIframeLoading(true);
                          setShowAudioMenu(false);
                        }}
                      >
                        MultiEmbed (Hindi)
                      </button>
                      <button
                        type="button"
                        className={`redzone-hindi-mirror-btn ${serverId === "smashy" ? "active" : ""}`}
                        onClick={() => {
                          setServerId("smashy");
                          storage.set("redzone_preferred_server", "smashy");
                          setIframeLoading(true);
                          setShowAudioMenu(false);
                        }}
                      >
                        SmashyStream
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Option 2: Server Selection */}
          <div className="redzone-bottom-menu-wrap" ref={serverMenuRef}>
            <button
              type="button"
              className={`redzone-player-skip-btn redzone-liquid-glass-btn ${showServerMenu ? "active" : ""}`}
              onClick={() => {
                setShowAudioMenu(false);
                setShowServerMenu((prev) => !prev);
              }}
              title="Change Server"
              aria-label="Server"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span className="redzone-btn-text-hide-mobile">{currentServer.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showServerMenu && (
              <div className="redzone-bottom-popover-menu redzone-liquid-glass-panel">
                <div className="redzone-bottom-popover-title">
                  <span>Streaming Server</span>
                  <button
                    type="button"
                    className="redzone-bottom-popover-close"
                    onClick={() => setShowServerMenu(false)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="redzone-bottom-popover-list">
                  {STREAMING_SERVERS.map((srv) => {
                    const isCurrent = srv.id === serverId;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        className={`redzone-bottom-popover-item ${isCurrent ? "active" : ""}`}
                        onClick={() => {
                          setServerId(srv.id);
                          storage.set("redzone_preferred_server", srv.id);
                          setShowServerMenu(false);
                          setIframeLoading(true);
                        }}
                      >
                        <div className="redzone-popover-item-left">
                          <div>
                            <div className="redzone-popover-item-label">{srv.name}</div>
                            <div className="redzone-popover-item-sub">{srv.quality} • {srv.tag}</div>
                          </div>
                        </div>
                        {isCurrent && <span className="redzone-popover-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="3" />
                <polygon points="19 20 9 12 19 4 19 20" />
              </svg>
              <span className="redzone-btn-text-hide-mobile">Prev</span>
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
              <span>Next</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="3" />
              </svg>
            </button>
          )}

          {/* Fullscreen Button in Bottom Bar */}
          <button
            type="button"
            className={`redzone-player-skip-btn redzone-player-fullscreen-btn redzone-liquid-glass-btn ${isFullscreen ? "active" : ""}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen Mode (F)"}
            aria-label="Fullscreen"
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
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
