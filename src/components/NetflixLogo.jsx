export default function NetflixLogo({ width = 120, height = 30, className = "" }) {
  return (
    <div
      className={`redzone-brand-logo ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
        userSelect: "none",
        cursor: "pointer",
      }}
      role="img"
      aria-label="REDZONE"
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 140 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="redzone-logo-svg"
      >
        <defs>
          <linearGradient id="redzoneLogoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff133d" />
            <stop offset="100%" stopColor="#b8001f" />
          </linearGradient>
          <filter id="redzoneGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="rgba(229, 9, 20, 0.55)" />
          </filter>
        </defs>

        {/* Curved bottom shadow / subtle base arch */}
        <path
          d="M 10 28 Q 70 32 130 28"
          stroke="rgba(229, 9, 20, 0.4)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Condensed Bold Uppercase Typography */}
        <text
          x="50%"
          y="23"
          textAnchor="middle"
          fill="url(#redzoneLogoGrad)"
          filter="url(#redzoneGlowFilter)"
          style={{
            fontFamily: "'Bebas Neue', 'Outfit', 'Impact', sans-serif",
            fontSize: "27px",
            fontWeight: "900",
            letterSpacing: "3.2px",
          }}
        >
          REDZONE
        </text>
      </svg>
    </div>
  );
}

