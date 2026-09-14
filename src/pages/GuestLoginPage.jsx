import { useState } from "react";
import NetflixLogo from "../components/NetflixLogo";

const NETFLIX_PROFILES = [
  {
    id: "primary",
    name: "User",
    color: "#E50914",
    avatarIcon: "😊",
    avatarLabel: "Red Smile",
  },
  {
    id: "cinephile",
    name: "Cinephile",
    color: "#0071eb",
    avatarIcon: "🎬",
    avatarLabel: "Blue Critic",
  },
  {
    id: "kids",
    name: "Kids",
    color: "#ffaa00",
    avatarIcon: "👶",
    avatarLabel: "Kids",
    isKids: true,
  },
  {
    id: "guest",
    name: "Guest",
    color: "#2bb871",
    avatarIcon: "🍿",
    avatarLabel: "Green Guest",
  },
];

export default function GuestLoginPage({ onLogin }) {
  const [customName, setCustomName] = useState("");
  const [showAddProfile, setShowAddProfile] = useState(false);

  const handleSelectProfile = (profile) => {
    onLogin({
      username: profile.name,
      avatar: profile.avatarIcon,
      color: profile.color,
      isKids: !!profile.isKids,
      loginTime: Date.now(),
    });
  };

  const handleCreateCustom = (e) => {
    e.preventDefault();
    const finalName = customName.trim() || "New Viewer";
    onLogin({
      username: finalName,
      avatar: "👤",
      color: "#9933cc",
      loginTime: Date.now(),
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#141414",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Netflix Logo */}
      <div style={{ position: "absolute", top: 32, left: "4%" }}>
        <NetflixLogo width={120} height={35} />
      </div>

      <div style={{ maxWidth: 800, width: "100%", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(32px, 4vw, 56px)",
            fontWeight: 500,
            marginBottom: 48,
            letterSpacing: "-0.5px",
          }}
        >
          Who's watching?
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "clamp(16px, 3vw, 36px)",
            flexWrap: "wrap",
            marginBottom: 56,
          }}
        >
          {NETFLIX_PROFILES.map((profile) => (
            <div
              key={profile.id}
              onClick={() => handleSelectProfile(profile)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                width: "clamp(100px, 12vw, 140px)",
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                const box = e.currentTarget.querySelector(".profile-box");
                if (box) box.style.borderColor = "#ffffff";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                const box = e.currentTarget.querySelector(".profile-box");
                if (box) box.style.borderColor = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                className="profile-box"
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  borderRadius: 6,
                  backgroundColor: profile.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  border: "3px solid transparent",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  transition: "border-color 0.2s ease",
                }}
              >
                {profile.avatarIcon}
              </div>
              <span
                style={{
                  marginTop: 14,
                  fontSize: 16,
                  color: "#808080",
                  fontWeight: 400,
                  transition: "color 0.2s ease",
                }}
              >
                {profile.name}
              </span>
            </div>
          ))}

          {/* Add Profile Tile */}
          <div
            onClick={() => setShowAddProfile((prev) => !prev)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              width: "clamp(100px, 12vw, 140px)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              const box = e.currentTarget.querySelector(".profile-box");
              if (box) box.style.borderColor = "#ffffff";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              const box = e.currentTarget.querySelector(".profile-box");
              if (box) box.style.borderColor = "transparent";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <div
              className="profile-box"
              style={{
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: 6,
                backgroundColor: "transparent",
                border: "2px dashed #808080",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                color: "#808080",
                transition: "all 0.2s ease",
              }}
            >
              +
            </div>
            <span
              style={{
                marginTop: 14,
                fontSize: 16,
                color: "#808080",
                fontWeight: 400,
              }}
            >
              Add Profile
            </span>
          </div>
        </div>

        {/* Add Profile Custom Form */}
        {showAddProfile && (
          <form
            onSubmit={handleCreateCustom}
            style={{
              display: "inline-flex",
              gap: 12,
              marginBottom: 40,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name your profile"
              autoFocus
              style={{
                background: "#333",
                border: "1px solid #555",
                borderRadius: 4,
                padding: "10px 16px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
                width: 220,
              }}
            />
            <button
              type="submit"
              style={{
                background: "#E50914",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "10px 20px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </form>
        )}

        <div>
          <button
            type="button"
            onClick={() => handleSelectProfile(NETFLIX_PROFILES[0])}
            style={{
              background: "transparent",
              color: "#808080",
              border: "1px solid #808080",
              padding: "10px 28px",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.borderColor = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#808080";
              e.currentTarget.style.borderColor = "#808080";
            }}
          >
            Manage Profiles
          </button>
        </div>
      </div>
    </div>
  );
}
