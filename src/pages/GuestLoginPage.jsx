import React, { useState, useEffect, useRef } from "react";
import ProfileAvatar, { AVATAR_PRESETS } from "../components/ProfileAvatar";
import { storage } from "../utils/storage";

const PROFILES_STORAGE_KEY = "redzone_user_profiles";

// Initial profiles: ONLY 1 default profile named "redzone" (no other pre-made profiles)
const DEFAULT_INITIAL_PROFILES = [
  {
    id: "profile_redzone",
    name: "redzone",
    avatar: "smiley_red",
    color: "#E50914",
    isKids: false,
    createdAt: Date.now(),
  },
];

// Featured Top Banners that rotate every few seconds (matching Netflix mobile profile design)
const FEATURED_HERO_BANNERS = [
  {
    id: "lust_stories_3",
    title: "Lust Stories 3",
    brand: "NETFLIX",
    subtitle: "Coming on Friday",
    imageUrl:
      "https://images.unsplash.com/photo-1578836537282-3171d77f8632?auto=format&fit=crop&w=1200&q=80",
    bgGradient:
      "linear-gradient(to bottom, rgba(30, 8, 14, 0) 0%, rgba(30, 8, 14, 0.4) 40%, rgba(30, 8, 14, 0.9) 75%, #19060c 100%)",
    themeColor: "#570d1a",
  },
  {
    id: "money_heist",
    title: "Money Heist",
    brand: "NETFLIX",
    subtitle: "Watch Part 5: The Final Season",
    imageUrl:
      "https://image.tmdb.org/t/p/original/reEMJA1uzscCbk5rUh1bBm7m04L.jpg",
    bgGradient:
      "linear-gradient(to bottom, rgba(20, 6, 8, 0) 0%, rgba(20, 6, 8, 0.4) 40%, rgba(20, 6, 8, 0.9) 75%, #140507 100%)",
    themeColor: "#450a0a",
  },
  {
    id: "stranger_things",
    title: "Stranger Things",
    brand: "NETFLIX",
    subtitle: "The Final Adventure • Season 5",
    imageUrl:
      "https://image.tmdb.org/t/p/original/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    bgGradient:
      "linear-gradient(to bottom, rgba(10, 14, 28, 0) 0%, rgba(10, 14, 28, 0.4) 40%, rgba(10, 14, 28, 0.9) 75%, #080a14 100%)",
    themeColor: "#0f172a",
  },
  {
    id: "wednesday",
    title: "Wednesday",
    brand: "NETFLIX",
    subtitle: "Season 2 • Dark & Mischievous",
    imageUrl:
      "https://image.tmdb.org/t/p/original/9PFonQ95Ki6VyDCguUrE4Am9agq.jpg",
    bgGradient:
      "linear-gradient(to bottom, rgba(16, 12, 22, 0) 0%, rgba(16, 12, 22, 0.4) 40%, rgba(16, 12, 22, 0.9) 75%, #0d0913 100%)",
    themeColor: "#1e1329",
  },
  {
    id: "squid_game",
    title: "Squid Game",
    brand: "NETFLIX",
    subtitle: "The Real Game Begins • Season 3",
    imageUrl:
      "https://image.tmdb.org/t/p/original/dDlGca4hY74e8z2jN4k49zJb14m.jpg",
    bgGradient:
      "linear-gradient(to bottom, rgba(24, 8, 18, 0) 0%, rgba(24, 8, 18, 0.4) 40%, rgba(24, 8, 18, 0.9) 75%, #12040d 100%)",
    themeColor: "#380e22",
  },
];

export default function GuestLoginPage({ onLogin }) {
  // Load user profiles from storage, or fallback to the single initial "redzone" profile
  const [profiles, setProfiles] = useState(() => {
    const saved = storage.get(PROFILES_STORAGE_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    // Save the single default profile
    storage.set(PROFILES_STORAGE_KEY, DEFAULT_INITIAL_PROFILES);
    return DEFAULT_INITIAL_PROFILES;
  });

  const [isManaging, setIsManaging] = useState(false);
  const [showModal, setShowModal] = useState(false); // Add or Edit Profile modal
  const [editingProfile, setEditingProfile] = useState(null);

  // Form states for creating / editing
  const [formName, setFormName] = useState("");
  const [formAvatar, setFormAvatar] = useState("smiley_red");
  const [formColor, setFormColor] = useState("#E50914");
  const [formIsKids, setFormIsKids] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Top banner carousel state
  const [banners, setBanners] = useState(FEATURED_HERO_BANNERS);
  const [bannerIndex, setBannerIndex] = useState(0);

  // Rotate banner every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Optionally fetch trending TMDB titles to enhance the carousel
  useEffect(() => {
    let isMounted = true;
    async function fetchTrendingBanners() {
      try {
        const apiKey = storage.get("tmdb_api_key") || "84128509c693a7eb73d6b8b3db208579";
        const res = await fetch(
          `https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.results && data.results.length > 0 && isMounted) {
          const tmdbBanners = data.results
            .filter((item) => item.backdrop_path && (item.title || item.name))
            .slice(0, 6)
            .map((item) => ({
              id: "tmdb_" + item.id,
              title: item.title || item.name,
              brand: "NETFLIX",
              subtitle: item.release_date
                ? `Trending • Released ${item.release_date.slice(0, 4)}`
                : "Top 10 in Movies Today",
              imageUrl: `https://image.tmdb.org/t/p/original${item.backdrop_path}`,
              bgGradient:
                "linear-gradient(to bottom, rgba(20, 8, 14, 0) 0%, rgba(20, 8, 14, 0.4) 40%, rgba(20, 8, 14, 0.9) 75%, #19060c 100%)",
              themeColor: "#2b0d16",
            }));

          if (tmdbBanners.length > 0) {
            setBanners([FEATURED_HERO_BANNERS[0], ...tmdbBanners]);
          }
        }
      } catch {
        // Fallback gracefully to default curated banners
      }
    }
    fetchTrendingBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveProfiles = (list) => {
    setProfiles(list);
    storage.set(PROFILES_STORAGE_KEY, list);
  };

  const handleSelectProfile = (profile) => {
    if (isManaging) {
      // In edit mode: clicking a profile opens the Edit Profile screen
      setEditingProfile(profile);
      setFormName(profile.name);
      setFormAvatar(profile.avatar || "smiley_red");
      setFormColor(profile.color || "#E50914");
      setFormIsKids(Boolean(profile.isKids));
      setShowAvatarPicker(false);
      setShowModal(true);
      return;
    }

    // Normal mode: Log in with this profile
    onLogin({
      id: profile.id,
      username: profile.name,
      avatar: profile.avatar || "smiley_red",
      color: profile.color || "#E50914",
      isKids: Boolean(profile.isKids),
      loginTime: Date.now(),
    });
  };

  const handleOpenAdd = () => {
    setEditingProfile(null);
    setFormName("");
    // Pick next attractive smiley color
    const colors = ["smiley_blue", "smiley_yellow", "smiley_green", "smiley_purple", "smiley_pink", "smiley_red"];
    const chosen = colors[profiles.length % colors.length];
    const preset = AVATAR_PRESETS.find((p) => p.id === chosen) || AVATAR_PRESETS[0];
    setFormAvatar(preset.id);
    setFormColor(preset.color);
    setFormIsKids(false);
    setShowAvatarPicker(false);
    setShowModal(true);
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) return;

    if (editingProfile) {
      // Update existing profile
      const updated = profiles.map((p) =>
        p.id === editingProfile.id
          ? {
              ...p,
              name: trimmed,
              avatar: formAvatar,
              color: formColor,
              isKids: formIsKids,
            }
          : p,
      );
      saveProfiles(updated);
      setShowModal(false);
      setEditingProfile(null);
    } else {
      // Create new profile
      const newProf = {
        id: "profile_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        name: trimmed,
        avatar: formIsKids ? "kids" : formAvatar,
        color: formColor,
        isKids: formIsKids,
        createdAt: Date.now(),
      };
      const updated = [...profiles, newProf];
      saveProfiles(updated);
      setShowModal(false);
    }
  };

  const handleDeleteProfile = (idToDelete) => {
    if (profiles.length <= 1) {
      alert("You must keep at least one profile.");
      return;
    }
    const updated = profiles.filter((p) => p.id !== idToDelete);
    saveProfiles(updated);
    setShowModal(false);
    setEditingProfile(null);
  };

  const handleBannerClick = () => {
    // If not managing, logging in with first available profile (default "redzone")
    if (isManaging) return;
    const activeProfile = profiles[0] || DEFAULT_INITIAL_PROFILES[0];
    handleSelectProfile(activeProfile);
  };

  const currentBanner = banners[bannerIndex] || banners[0];

  return (
    <div className="redzone-profile-screen-v2">
      {/* ── TOP MONEY / MOVIE BANNER CAROUSEL ──────────────────────────────── */}
      <div
        className="redzone-hero-banner-wrap"
        onClick={handleBannerClick}
        style={{ cursor: isManaging ? "default" : "pointer" }}
        title="Tap to Watch on REDZONE"
      >
        {banners.map((b, idx) => (
          <div
            key={b.id || idx}
            className={`redzone-hero-banner-slide ${idx === bannerIndex ? "active" : ""}`}
            style={{
              backgroundImage: `url("${b.imageUrl}")`,
            }}
          >
            <div
              className="redzone-hero-banner-overlay"
              style={{
                background:
                  b.bgGradient ||
                  "linear-gradient(to bottom, rgba(20, 8, 14, 0) 0%, rgba(20, 8, 14, 0.4) 40%, rgba(20, 8, 14, 0.9) 75%, #14080e 100%)",
              }}
            />
          </div>
        ))}

        {/* Banner Content overlay (Title, Brand & Tagline) */}
        <div className="redzone-hero-banner-content">
          <div className="redzone-banner-brand">
            {currentBanner.brand || "NETFLIX"}
          </div>
          <h1 className="redzone-banner-title">{currentBanner.title}</h1>
          <p className="redzone-banner-subtitle">{currentBanner.subtitle}</p>

          {/* Slide Indicator Dots */}
          <div className="redzone-banner-dots" onClick={(e) => e.stopPropagation()}>
            {banners.map((_, idx) => (
              <span
                key={idx}
                className={`redzone-banner-dot ${idx === bannerIndex ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setBannerIndex(idx);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM PROFILES SELECTION SECTION ──────────────────────────────── */}
      <div className="redzone-profiles-section">
        <h2 className="redzone-choose-title">Choose your profile</h2>

        <div className="redzone-profiles-grid-3col">
          {/* Render all user profiles */}
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="redzone-profile-card"
              onClick={() => handleSelectProfile(profile)}
            >
              <div className="redzone-profile-avatar-wrapper">
                <ProfileAvatar
                  avatar={profile.avatar}
                  color={profile.color}
                  isKids={profile.isKids}
                  size={92}
                  borderRadius={18}
                  className="redzone-profile-card-avatar"
                />

                {/* Edit Pencil Overlay badge when in Manage mode */}
                {isManaging && (
                  <div className="redzone-profile-edit-badge">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="redzone-profile-card-name">{profile.name}</span>
            </div>
          ))}

          {/* Add Profile Button */}
          {profiles.length < 6 && (
            <div className="redzone-profile-card" onClick={handleOpenAdd}>
              <div className="redzone-profile-action-box">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="redzone-profile-card-name">Add</span>
            </div>
          )}

          {/* Edit / Done Button */}
          <div
            className="redzone-profile-card"
            onClick={() => setIsManaging((prev) => !prev)}
          >
            <div
              className={`redzone-profile-action-box ${isManaging ? "active" : ""}`}
            >
              {isManaging ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              )}
            </div>
            <span className="redzone-profile-card-name">
              {isManaging ? "Done" : "Edit"}
            </span>
          </div>
        </div>
      </div>

      {/* ── ADD / EDIT PROFILE MODAL (Same to same like IMG_2831.png) ──────── */}
      {showModal && (
        <div
          className="redzone-modal-backdrop-v2"
          onClick={() => setShowModal(false)}
        >
          <div
            className="redzone-add-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="redzone-modal-top-bar">
              <button
                type="button"
                className="redzone-modal-btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <h3 className="redzone-modal-screen-title">
                {editingProfile ? "Edit Profile" : "Add Profile"}
              </h3>
              <button
                type="button"
                className={`redzone-modal-btn-save ${formName.trim() ? "ready" : "disabled"}`}
                disabled={!formName.trim()}
                onClick={handleSaveProfile}
              >
                Save
              </button>
            </div>

            {/* Main Modal Body */}
            <div className="redzone-modal-body">
              {/* Profile Avatar with Edit Pencil Badge */}
              <div className="redzone-modal-avatar-center">
                <div
                  className="redzone-modal-avatar-relative"
                  onClick={() => setShowAvatarPicker((prev) => !prev)}
                >
                  <ProfileAvatar
                    avatar={formIsKids ? "kids" : formAvatar}
                    color={formColor}
                    isKids={formIsKids}
                    size={116}
                    borderRadius={22}
                  />
                  {/* Floating Circular White Edit Badge */}
                  <button
                    type="button"
                    className="redzone-avatar-edit-pencil-badge"
                    aria-label="Change Avatar"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Avatar Selector Dropdown / Grid */}
              {showAvatarPicker && (
                <div className="redzone-avatar-picker-sheet">
                  <div className="redzone-picker-title">Choose Avatar Icon</div>
                  <div className="redzone-picker-grid">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`redzone-picker-avatar-btn ${formAvatar === preset.id ? "selected" : ""}`}
                        onClick={() => {
                          setFormAvatar(preset.id);
                          setFormColor(preset.color);
                          if (preset.id === "kids") {
                            setFormIsKids(true);
                          }
                          setShowAvatarPicker(false);
                        }}
                      >
                        <ProfileAvatar
                          avatar={preset.id}
                          color={preset.color}
                          size={46}
                          borderRadius={10}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Profile Name Input Field */}
              <div className="redzone-modal-input-group">
                <input
                  type="text"
                  className="redzone-profile-name-input"
                  placeholder="Profile name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={25}
                  autoFocus
                />
              </div>

              {/* Kids Profile Switch Section */}
              <div className="redzone-kids-profile-control">
                <div className="redzone-kids-toggle-row">
                  <label className="redzone-ios-toggle">
                    <input
                      type="checkbox"
                      checked={formIsKids}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormIsKids(checked);
                        if (checked && formAvatar !== "kids") {
                          setFormAvatar("kids");
                        } else if (!checked && formAvatar === "kids") {
                          setFormAvatar("smiley_red");
                        }
                      }}
                    />
                    <span className="redzone-ios-slider" />
                  </label>
                </div>

                <div className="redzone-kids-title">Kids Profile</div>
                <div className="redzone-kids-description">
                  Made for children 12 and under, but parents have all the control.
                </div>
              </div>

              {/* Delete Profile (when editing) */}
              {editingProfile && (
                <div className="redzone-modal-delete-wrap">
                  <button
                    type="button"
                    className="redzone-btn-delete-profile"
                    onClick={() => handleDeleteProfile(editingProfile.id)}
                  >
                    Delete Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
