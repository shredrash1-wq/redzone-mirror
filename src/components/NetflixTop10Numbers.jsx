import { memo } from "react";

/**
 * Authentic Netflix Top 10 Numbered Glyphs
 * Styled in Netflix's hollow 3D serif typography with dark gradient fill and crisp stroke
 */
export const NetflixTop10Number = memo(function NetflixTop10Number({ rank }) {
  // SVG paths for numbers 1 to 10
  return (
    <div className="netflix-top10-num-wrap" style={{ position: "relative", width: 88, height: 160, flexShrink: 0, marginRight: -18, zIndex: 1 }}>
      <svg
        viewBox="0 0 100 160"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`grad-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#222222" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
        </defs>
        <text
          x={rank === 10 ? "46" : "54"}
          y="136"
          fill={`url(#grad-${rank})`}
          stroke="#595959"
          strokeWidth="4"
          strokeLinejoin="round"
          textAnchor="middle"
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: rank === 10 ? "130px" : "164px",
            fontWeight: "900",
            letterSpacing: "-8px",
          }}
        >
          {rank}
        </text>
      </svg>
    </div>
  );
});

export default NetflixTop10Number;
