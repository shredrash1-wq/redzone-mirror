import React from "react";

export const AVATAR_PRESETS = [
  { id: "smiley_red", type: "smiley", color: "#E50914", name: "Redzone Red Smiley" },
  { id: "smiley_blue", type: "smiley", color: "#0071eb", name: "Electric Blue Smiley" },
  { id: "smiley_yellow", type: "smiley", color: "#f5a623", name: "Sun Yellow Smiley" },
  { id: "smiley_green", type: "smiley", color: "#2bb871", name: "Emerald Green Smiley" },
  { id: "smiley_purple", type: "smiley", color: "#9933cc", name: "Royal Purple Smiley" },
  { id: "smiley_pink", type: "smiley", color: "#e91e63", name: "Neon Pink Smiley" },
  { id: "kids", type: "kids", color: "#e50914", name: "Kids Rainbow Avatar" },
  { id: "professor", type: "professor", color: "#1c2430", name: "Professor Avatar" },
  { id: "cinema", type: "emoji", icon: "🎬", color: "#222222", name: "Cinema" },
  { id: "popcorn", type: "emoji", icon: "🍿", color: "#222222", name: "Popcorn" },
  { id: "crown", type: "emoji", icon: "👑", color: "#222222", name: "Crown" },
  { id: "shades", type: "emoji", icon: "🕶️", color: "#222222", name: "Shades" },
  { id: "rocket", type: "emoji", icon: "🚀", color: "#222222", name: "Rocket" },
  { id: "fox", type: "emoji", icon: "🦊", color: "#222222", name: "Fox" },
  { id: "lightning", type: "emoji", icon: "⚡", color: "#222222", name: "Lightning" },
  { id: "robot", type: "emoji", icon: "🤖", color: "#222222", name: "Robot" },
];

export default function ProfileAvatar({
  avatar = "smiley_red",
  color = "#E50914",
  isKids = false,
  size = 80,
  borderRadius,
  className = "",
  style = {},
}) {
  const radius = borderRadius !== undefined ? borderRadius : Math.round(size * 0.22);

  // If Kids profile or 'kids' avatar
  if (avatar === "kids" || isKids) {
    return (
      <div
        className={`redzone-avatar-container ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: "linear-gradient(135deg, #fbc02d 0%, #4caf50 33%, #e91e63 66%, #2196f3 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          ...style,
        }}
      >
        <div
          style={{
            background: "#E50914",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: Math.max(10, Math.round(size * 0.26)),
            padding: `${Math.max(2, Math.round(size * 0.03))}px ${Math.max(4, Math.round(size * 0.1))}px`,
            borderRadius: Math.max(3, Math.round(size * 0.08)),
            fontFamily: "Outfit, system-ui, -apple-system, sans-serif",
            letterSpacing: -0.5,
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            textTransform: "lowercase",
            userSelect: "none",
          }}
        >
          kids
        </div>
      </div>
    );
  }

  // Professor Avatar
  if (avatar === "professor") {
    return (
      <div
        className={`redzone-avatar-container ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "#16202c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          ...style,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          style={{ transform: "scale(1.05)" }}
        >
          <rect width="100" height="100" fill="#1b2838" />
          {/* Hair & Beard */}
          <path d="M 22 45 C 18 20, 82 20, 78 45 C 84 75, 75 92, 50 95 C 25 92, 16 75, 22 45 Z" fill="#11161d" />
          {/* Face */}
          <ellipse cx="50" cy="50" rx="24" ry="28" fill="#d4a373" />
          {/* Glasses */}
          <rect x="30" y="42" width="16" height="14" rx="3" fill="none" stroke="#222" strokeWidth="2.5" />
          <rect x="54" y="42" width="16" height="14" rx="3" fill="none" stroke="#222" strokeWidth="2.5" />
          <line x1="46" y1="48" x2="54" y2="48" stroke="#222" strokeWidth="2.5" />
          {/* Eyes */}
          <circle cx="38" cy="49" r="2.5" fill="#222" />
          <circle cx="62" cy="49" r="2.5" fill="#222" />
          {/* Mustache & Beard */}
          <path d="M 36 62 Q 50 67 64 62 Q 58 72 50 73 Q 42 72 36 62 Z" fill="#11161d" />
          <path d="M 32 68 C 36 84, 64 84, 68 68 C 62 88, 38 88, 32 68 Z" fill="#11161d" />
          {/* Tie & Collar */}
          <polygon points="50,78 44,98 56,98" fill="#e50914" />
          <polygon points="34,86 50,80 66,86 50,100" fill="#0d1117" />
        </svg>
      </div>
    );
  }

  // Smiley avatars (Red, Blue, Yellow, Green, Purple, Pink, or custom color)
  const isSmiley =
    !avatar ||
    avatar.startsWith("smiley") ||
    avatar === "👤" ||
    avatar === "N" ||
    avatar === "default";

  let bg = color || "#E50914";
  if (avatar === "smiley_blue") bg = "#0071eb";
  if (avatar === "smiley_yellow") bg = "#f5a623";
  if (avatar === "smiley_red") bg = "#E50914";
  if (avatar === "smiley_green") bg = "#2bb871";
  if (avatar === "smiley_purple") bg = "#9933cc";
  if (avatar === "smiley_pink") bg = "#e91e63";

  if (isSmiley) {
    return (
      <div
        className={`redzone-avatar-container ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          ...style,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="74%"
          height="74%"
          fill="none"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
        >
          {/* Eyes */}
          <circle cx="28" cy="38" r="7.5" fill="#ffffff" />
          <circle cx="72" cy="38" r="7.5" fill="#ffffff" />
          {/* Clean curved smile */}
          <path
            d="M 28 60 Q 50 82 72 60"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  // Emoji / Icon Avatar
  return (
    <div
      className={`redzone-avatar-container ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: color || "#222222",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
        fontSize: Math.max(14, Math.round(size * 0.5)),
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
        flexShrink: 0,
        ...style,
      }}
    >
      <span>{avatar}</span>
    </div>
  );
}
