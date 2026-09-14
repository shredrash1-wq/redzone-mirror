import { useState } from "react";
import { imgUrl } from "../utils/api";

export default function NetflixHero({ item, onPlay, onMoreInfo, ageRating }) {
  const [muted, setMuted] = useState(true);

  if (!item) return null;

  const isTV = item.media_type === "tv" || !item.release_date;
  const title = item.title || item.name || "Featured Title";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const backdrop = imgUrl(item.backdrop_path, "original") || imgUrl(item.poster_path, "original");
  const ratingPct = item.vote_average ? Math.min(99, Math.round(item.vote_average * 10) + 2) : 98;
  const overview = item.overview || "Now streaming on REDZONE. Watch top blockbusters, award-winning series, and original productions.";

  return (
    <div className="netflix-billboard">
      {backdrop ? (
        <img
          src={backdrop}
          alt={title}
          className="netflix-billboard-backdrop"
          draggable={false}
        />
      ) : (
        <div
          className="netflix-billboard-backdrop"
          style={{ background: "radial-gradient(circle at 60% 40%, #292929 0%, #141414 100%)" }}
        />
      )}

      {/* Side and bottom vignettes for high contrast */}
      <div className="netflix-billboard-vignette" />
      <div className="netflix-billboard-bottom-gradient" />

      <div className="netflix-billboard-content">
        {/* REDZONE Series / Film badge */}
        <div className="netflix-badge-nseries">
          <span className="netflix-n-icon">R</span>
          <span>{isTV ? "SERIES" : "FILM"}</span>
        </div>

        {/* Title */}
        <h1 className="netflix-billboard-title">{title}</h1>

        {/* Top 10 badge */}
        <div className="netflix-billboard-top10">
          <div className="netflix-top10-badge-square">TOP 10</div>
          <span className="netflix-top10-text">
            #1 in {isTV ? "TV Shows" : "Movies"} Today
          </span>
        </div>

        {/* Metadata badges */}
        <div className="netflix-billboard-meta">
          <span className="netflix-match-score">{ratingPct}% Match</span>
          {year && <span className="netflix-year">{year}</span>}
          <span className="netflix-age-pill">{ageRating || (isTV ? "TV-MA" : "16+")}</span>
          <span className="netflix-quality-pill">4K Ultra HD</span>
          <span className="netflix-quality-pill">5.1</span>
        </div>

        {/* Overview */}
        <p className="netflix-billboard-overview">{overview}</p>

        {/* Action Buttons */}
        <div className="netflix-billboard-actions">
          <button
            className="netflix-btn-play"
            onClick={() => onPlay(item)}
            title="Play"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play
          </button>

          <button
            className="netflix-btn-info"
            onClick={() => onMoreInfo(item)}
            title="More Info"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            More Info
          </button>
        </div>
      </div>

      {/* Right side sound toggle & rating label */}
      <div className="netflix-billboard-right-controls">
        <button
          className="netflix-sound-toggle"
          onClick={() => setMuted((prev) => !prev)}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
        <div className="netflix-rating-banner">
          {ageRating || (isTV ? "TV-MA" : "16+")}
        </div>
      </div>
    </div>
  );
}
