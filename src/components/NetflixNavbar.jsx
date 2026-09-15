import { useState, useEffect, useRef } from "react";
import NetflixLogo from "./NetflixLogo";
import ProfileAvatar from "./ProfileAvatar";

export default function NetflixNavbar({
  activeTab = "home",
  onSelectTab,
  searchQuery = "",
  setSearchQuery,
  user,
  onLogout,
  onOpenSettings,
  isKids = false,
  onToggleKids,
  downloadsCount = 0,
  notifications = [],
  onSelectMedia,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(Boolean(searchQuery));
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Scroll listener for transparent to black navbar transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Global keyboard shortcut: cmd/ctrl+K or / opens search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && searchOpen && !searchQuery) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, searchQuery]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (
        searchOpen &&
        !searchQuery &&
        !e.target.closest(".netflix-search-box")
      ) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen, searchQuery]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val && activeTab !== "search") {
      onSelectTab("search");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  return (
    <header
      className={`netflix-header ${scrolled ? "netflix-header--scrolled" : ""}`}
    >
      <div className="netflix-header-left">
        <div
          className="netflix-logo-link"
          onClick={() => {
            setSearchQuery("");
            onSelectTab("home");
          }}
          title="Netflix Home"
        >
          <NetflixLogo width={100} height={28} className="netflix-logo-svg" />
        </div>

        <nav>
          <ul className="netflix-nav-links">
            <li className="netflix-nav-item">
              <button
                className={`netflix-nav-btn ${activeTab === "home" ? "active" : ""}`}
                onClick={() => {
                  setSearchQuery("");
                  onSelectTab("home");
                }}
              >
                Home
              </button>
            </li>
            <li className="netflix-nav-item">
              <button
                className={`netflix-nav-btn ${activeTab === "tv" ? "active" : ""}`}
                onClick={() => {
                  setSearchQuery("");
                  onSelectTab("tv");
                }}
              >
                TV Shows
              </button>
            </li>
            <li className="netflix-nav-item">
              <button
                className={`netflix-nav-btn ${activeTab === "movies" ? "active" : ""}`}
                onClick={() => {
                  setSearchQuery("");
                  onSelectTab("movies");
                }}
              >
                Movies
              </button>
            </li>
            <li className="netflix-nav-item">
              <button
                className={`netflix-nav-btn ${activeTab === "new" ? "active" : ""}`}
                onClick={() => {
                  setSearchQuery("");
                  onSelectTab("new");
                }}
              >
                New & Popular
              </button>
            </li>
            <li className="netflix-nav-item">
              <button
                className={`netflix-nav-btn ${activeTab === "my-list" ? "active" : ""}`}
                onClick={() => {
                  setSearchQuery("");
                  onSelectTab("my-list");
                }}
              >
                My List
              </button>
            </li>
            <li className="netflix-nav-item">
              <button
                className={`netflix-nav-btn ${activeTab === "downloads" ? "active" : ""}`}
                onClick={() => onSelectTab("downloads")}
              >
                Downloads {downloadsCount > 0 ? `(${downloadsCount})` : ""}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="netflix-header-right">
        {/* Netflix Expandable Search Bar */}
        <div className="netflix-search-box">
          {!searchOpen ? (
            <button
              className="netflix-search-trigger"
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              aria-label="Search"
              title="Search (⌘K)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          ) : (
            <div className="netflix-search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="netflix-search-input"
                placeholder="Titles, people, genres..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="netflix-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear Search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Kids Mode Toggle */}
        <button
          className="netflix-kids-badge"
          onClick={onToggleKids}
          style={{
            fontWeight: isKids ? "800" : "500",
            color: isKids ? "var(--netflix-red)" : "#e5e5e5",
          }}
          title={isKids ? "Kids mode active (PG/Family only)" : "Switch to Kids Mode"}
        >
          {isKids ? "👶 KIDS (ON)" : "Kids"}
        </button>

        {/* Notifications Bell */}
        <div className="netflix-bell-wrap" ref={notifRef}>
          <button
            className="netflix-bell-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="netflix-bell-badge">3</span>
          </button>

          {showNotifications && (
            <div className="netflix-notifications-menu">
              <div className="netflix-notification-header">Notifications</div>
              <div
                className="netflix-notification-item"
                onClick={() => {
                  setShowNotifications(false);
                  onSelectTab("new");
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 36,
                    background: "#e50914",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  🔥
                </div>
                <div className="netflix-notification-content">
                  <div className="netflix-notification-title">Top 10 Today in Movies</div>
                  <div className="netflix-notification-desc">New blockbusters just entered the charts</div>
                  <div className="netflix-notification-time">1 hour ago</div>
                </div>
              </div>

              <div
                className="netflix-notification-item"
                onClick={() => {
                  setShowNotifications(false);
                  onSelectTab("tv");
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 36,
                    background: "#222",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  📺
                </div>
                <div className="netflix-notification-content">
                  <div className="netflix-notification-title">New Episodes Available</div>
                  <div className="netflix-notification-desc">Continue your favorite series</div>
                  <div className="netflix-notification-time">5 hours ago</div>
                </div>
              </div>

              <div
                className="netflix-notification-item"
                onClick={() => {
                  setShowNotifications(false);
                  onSelectTab("my-list");
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 36,
                    background: "#1f2937",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  ⭐
                </div>
                <div className="netflix-notification-content">
                  <div className="netflix-notification-title">Watchlist Ready</div>
                  <div className="netflix-notification-desc">Explore your saved titles offline or streaming</div>
                  <div className="netflix-notification-time">1 day ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar with Dropdown */}
        <div className="netflix-profile-wrap" ref={profileRef}>
          <button
            className="netflix-avatar-btn"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            aria-label="User profile"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <ProfileAvatar
              avatar={user?.avatar || "smiley_red"}
              color={user?.color || "#E50914"}
              isKids={Boolean(user?.isKids)}
              size={32}
              borderRadius={6}
            />
            <span className="netflix-avatar-caret" />
          </button>

          {showProfileMenu && (
            <div className="netflix-profile-menu">
              <div
                className="netflix-profile-menu-item"
                style={{ cursor: "default", opacity: 0.9 }}
              >
                <ProfileAvatar
                  avatar={user?.avatar || "smiley_red"}
                  color={user?.color || "#E50914"}
                  isKids={Boolean(user?.isKids)}
                  size={26}
                  borderRadius={5}
                />
                <span style={{ fontWeight: 600 }}>{user?.username || "Guest User"}</span>
              </div>
              <div className="netflix-profile-menu-divider" />
              <button
                className="netflix-profile-menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onOpenSettings();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Account & Settings
              </button>
              <button
                className="netflix-profile-menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onSelectTab("my-list");
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                My List
              </button>
              <div className="netflix-profile-menu-divider" />
              <button
                className="netflix-profile-menu-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout?.();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Switch Profile
              </button>
              <button
                className="netflix-profile-menu-item"
                style={{ color: "#ff6b6b" }}
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout?.();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out of REDZONE
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
