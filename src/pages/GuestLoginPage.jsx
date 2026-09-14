import { useState, useEffect } from "react";
import NetflixLogo from "../components/NetflixLogo";
import { storage } from "../utils/storage";

const AVATAR_OPTIONS = [
  { icon: "🍿", label: "Popcorn" },
  { icon: "🎬", label: "Cinema" },
  { icon: "👑", label: "Crown" },
  { icon: "🕶️", label: "Shades" },
  { icon: "🚀", label: "Rocket" },
  { icon: "🦊", label: "Fox" },
  { icon: "⚡", label: "Lightning" },
  { icon: "🎮", label: "Gamer" },
  { icon: "🎧", label: "Beats" },
  { icon: "🦁", label: "Lion" },
  { icon: "🍕", label: "Pizza" },
  { icon: "💎", label: "Diamond" },
  { icon: "🤖", label: "Robot" },
  { icon: "🐱", label: "Cat" },
  { icon: "🌟", label: "Star" },
];

const COLOR_OPTIONS = [
  { hex: "#E50914", name: "Redzone Red" },
  { hex: "#0071eb", name: "Electric Blue" },
  { hex: "#ffaa00", name: "Amber Gold" },
  { hex: "#9933cc", name: "Royal Purple" },
  { hex: "#2bb871", name: "Emerald Green" },
  { hex: "#e91e63", name: "Neon Pink" },
];

const PROFILES_STORAGE_KEY = "redzone_user_profiles";

export default function GuestLoginPage({ onLogin }) {
  // Load only user-created profiles from storage; start with an empty array if none exist
  const [profiles, setProfiles] = useState(() => {
    const saved = storage.get(PROFILES_STORAGE_KEY);
    return Array.isArray(saved) ? saved : [];
  });

  const [isManaging, setIsManaging] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  // Form State for creating / editing
  const [formName, setFormName] = useState("");
  const [formAvatar, setFormAvatar] = useState(AVATAR_OPTIONS[0].icon);
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0].hex);
  const [formIsKids, setFormIsKids] = useState(false);
  const [formError, setFormError] = useState("");

  // Automatically prompt to create profile if no profiles exist yet
  useEffect(() => {
    if (profiles.length === 0) {
      setShowCreateModal(true);
    }
  }, [profiles.length]);

  const saveProfilesToStorage = (updatedList) => {
    setProfiles(updatedList);
    storage.set(PROFILES_STORAGE_KEY, updatedList);
  };

  const handleSelectProfile = (profile) => {
    if (isManaging) {
      // Open edit mode for this profile
      setEditingProfile(profile);
      setFormName(profile.name);
      setFormAvatar(profile.avatar || AVATAR_OPTIONS[0].icon);
      setFormColor(profile.color || COLOR_OPTIONS[0].hex);
      setFormIsKids(Boolean(profile.isKids));
      setFormError("");
      return;
    }

    onLogin({
      id: profile.id,
      username: profile.name,
      avatar: profile.avatar || "👤",
      color: profile.color || "#E50914",
      isKids: Boolean(profile.isKids),
      loginTime: Date.now(),
    });
  };

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setFormName("");
    setFormAvatar(AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)].icon);
    setFormColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].hex);
    setFormIsKids(false);
    setFormError("");
    setShowCreateModal(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      setFormError("Please enter a profile name.");
      return;
    }

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
          : p
      );
      saveProfilesToStorage(updated);
      setEditingProfile(null);
    } else {
      // Create new profile
      const newProfile = {
        id: "profile_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        name: trimmed,
        avatar: formAvatar,
        color: formColor,
        isKids: formIsKids,
        createdAt: Date.now(),
      };
      const updated = [...profiles, newProfile];
      saveProfilesToStorage(updated);
      setShowCreateModal(false);

      // If it was their first profile, log in immediately
      if (profiles.length === 0) {
        onLogin({
          id: newProfile.id,
          username: newProfile.name,
          avatar: newProfile.avatar,
          color: newProfile.color,
          isKids: Boolean(newProfile.isKids),
          loginTime: Date.now(),
        });
      }
    }
  };

  const handleDeleteProfile = (idToDelete) => {
    const updated = profiles.filter((p) => p.id !== idToDelete);
    saveProfilesToStorage(updated);
    setEditingProfile(null);
  };

  return (
    <div className="redzone-profile-screen">
      {/* Top Left REDZONE Logo */}
      <header className="redzone-profile-header">
        <NetflixLogo width={130} height={38} />
      </header>

      {/* Main Content: Profiles Selection */}
      <main className="redzone-profile-main">
        <h1 className="redzone-profile-title">
          {isManaging ? "Manage Profiles" : "Who's watching?"}
        </h1>

        <div className="redzone-profile-grid">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="redzone-profile-item"
              onClick={() => handleSelectProfile(profile)}
            >
              <div
                className="redzone-profile-avatar-box"
                style={{ backgroundColor: profile.color || "#E50914" }}
              >
                <span className="redzone-profile-avatar-symbol">{profile.avatar}</span>
                {isManaging && (
                  <div className="redzone-profile-edit-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                )}
                {profile.isKids && (
                  <div className="redzone-profile-kids-badge">KIDS</div>
                )}
              </div>
              <span className="redzone-profile-name">{profile.name}</span>
            </div>
          ))}

          {/* Add Profile Tile (up to 5 profiles) */}
          {profiles.length < 5 && (
            <div
              className="redzone-profile-item redzone-profile-add-item"
              onClick={handleOpenCreate}
            >
              <div className="redzone-profile-avatar-box redzone-profile-add-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="redzone-profile-name">Add Profile</span>
            </div>
          )}
        </div>

        {/* Action Button: Manage Profiles / Done */}
        {profiles.length > 0 && (
          <div className="redzone-profile-actions">
            <button
              type="button"
              className={`redzone-profile-manage-btn ${isManaging ? "active" : ""}`}
              onClick={() => setIsManaging((prev) => !prev)}
            >
              {isManaging ? "Done" : "Manage Profiles"}
            </button>
          </div>
        )}
      </main>

      {/* Modal: Create or Edit Profile */}
      {(showCreateModal || editingProfile) && (
        <div
          className="redzone-modal-backdrop"
          onClick={() => {
            if (profiles.length > 0) {
              setShowCreateModal(false);
              setEditingProfile(null);
            }
          }}
        >
          <div
            className="redzone-profile-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="redzone-form-modal-title">
              {editingProfile ? "Edit Profile" : "Create Profile"}
            </h2>
            <p className="redzone-form-modal-subtitle">
              Add a personalized profile for another person watching REDZONE.
            </p>

            <form onSubmit={handleSaveProfile} className="redzone-profile-form">
              {/* Avatar Preview & Chooser */}
              <div className="redzone-avatar-section">
                <div
                  className="redzone-preview-avatar"
                  style={{ backgroundColor: formColor }}
                >
                  <span className="redzone-preview-avatar-icon">{formAvatar}</span>
                </div>

                <div className="redzone-avatar-options">
                  <label className="redzone-field-label">Choose Avatar</label>
                  <div className="redzone-avatar-picker-grid">
                    {AVATAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.icon}
                        type="button"
                        className={`redzone-avatar-option-btn ${formAvatar === opt.icon ? "selected" : ""}`}
                        onClick={() => setFormAvatar(opt.icon)}
                        title={opt.label}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Chooser */}
              <div className="redzone-form-group">
                <label className="redzone-field-label">Avatar Theme Color</label>
                <div className="redzone-color-picker-row">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className={`redzone-color-dot ${formColor === c.hex ? "selected" : ""}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setFormColor(c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Profile Name Input */}
              <div className="redzone-form-group">
                <label className="redzone-field-label">Profile Name</label>
                <input
                  type="text"
                  className="redzone-input"
                  placeholder="e.g. Alex"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  autoFocus
                  maxLength={25}
                />
                {formError && <div className="redzone-input-error">{formError}</div>}
              </div>

              {/* Kids Profile Toggle */}
              <div className="redzone-kids-toggle-wrap">
                <label className="redzone-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formIsKids}
                    onChange={(e) => setFormIsKids(e.target.checked)}
                    className="redzone-checkbox"
                  />
                  <div>
                    <div className="redzone-checkbox-title">Kid's Profile?</div>
                    <div className="redzone-checkbox-desc">
                      Only display TV shows and movies rated for ages 12 and under.
                    </div>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="redzone-form-buttons">
                <button type="submit" className="redzone-btn-primary">
                  {editingProfile ? "Save Changes" : "Create Profile"}
                </button>

                {profiles.length > 0 && (
                  <button
                    type="button"
                    className="redzone-btn-secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingProfile(null);
                    }}
                  >
                    Cancel
                  </button>
                )}

                {editingProfile && (
                  <button
                    type="button"
                    className="redzone-btn-danger"
                    onClick={() => handleDeleteProfile(editingProfile.id)}
                  >
                    Delete Profile
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
