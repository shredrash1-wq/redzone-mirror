import { useState, useRef, memo } from "react";
import { imgUrl } from "../utils/api";
import NetflixTop10Number from "./NetflixTop10Numbers";

export const NetflixRow = memo(function NetflixRow({
  title,
  items = [],
  onSelect,
  onPlay,
  onToggleSave,
  isSaved,
  isTop10 = false,
  progressMap = {},
  ratingsMap = {},
}) {
  const trackRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoverPos, setHoverPos] = useState(null);
  const hoverTimeoutRef = useRef(null);

  if (!items || items.length === 0) return null;

  const scrollLeft = () => {
    if (trackRef.current) {
      const scrollAmount = trackRef.current.clientWidth * 0.75;
      trackRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (trackRef.current) {
      const scrollAmount = trackRef.current.clientWidth * 0.75;
      trackRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleCardMouseEnter = (e, item) => {
    if (isTop10) return; // Top 10 has its own distinct click behavior
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredItem(item);
      setHoverPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }, 350);
  };

  const handleCardMouseLeave = () => {
    clearTimeout(hoverTimeoutRef.current);
    setHoveredItem(null);
  };

  return (
    <div className="netflix-row" onMouseLeave={handleCardMouseLeave}>
      <div className="netflix-row-header">
        <div className="netflix-row-title-wrap">
          <h2 className="netflix-row-title">{title}</h2>
          <span className="netflix-row-explore">Explore All ›</span>
        </div>
      </div>

      <div className="netflix-carousel-wrapper">
        {/* Left Paddle */}
        <button
          type="button"
          className="netflix-carousel-paddle netflix-carousel-paddle--left"
          onClick={scrollLeft}
          aria-label="Previous items"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Carousel Track */}
        <div className="netflix-carousel-track" ref={trackRef}>
          {items.map((item, index) => {
            const isTV = item.media_type === "tv" || !item.release_date;
            const itemTitle = item.title || item.name;
            const year = (item.release_date || item.first_air_date || "").slice(0, 4);
            const image = imgUrl(item.backdrop_path, "w500") || imgUrl(item.poster_path, "w342");
            const posterImage = imgUrl(item.poster_path, "w342") || image;
            const progressKey = isTV
              ? (item.season != null && item.episode != null
                  ? `tv_${item.id}_s${item.season}e${item.episode}`
                  : `tv_${item.id}`)
              : `movie_${item.id}`;
            const progressPct = progressMap[progressKey] || progressMap[`tv_${item.id}`] || item.progress || 0;
            const matchScore = item.vote_average ? Math.min(99, Math.round(item.vote_average * 10) + 2) : 97;
            const saved = isSaved ? isSaved(item) : false;

            if (isTop10) {
              return (
                <div
                  key={`${item.id}-${index}`}
                  className="netflix-top10-card"
                  onClick={() => onSelect(item)}
                >
                  <NetflixTop10Number rank={index + 1} />
                  <div className="netflix-top10-poster-wrap">
                    {posterImage ? (
                      <img src={posterImage} alt={itemTitle} loading="lazy" />
                    ) : (
                      <div className="netflix-card-title-fallback">{itemTitle}</div>
                    )}
                    <span className="netflix-card-n-badge">R</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${item.id}-${index}`}
                className="netflix-card"
                onClick={() => onSelect(item)}
                onMouseEnter={(e) => handleCardMouseEnter(e, item)}
              >
                <div className="netflix-card-poster-wrap">
                  {image ? (
                    <img
                      src={image}
                      alt={itemTitle}
                      className="netflix-card-poster"
                      loading="lazy"
                    />
                  ) : (
                    <div className="netflix-card-title-fallback">
                      {itemTitle}
                    </div>
                  )}

                  {/* REDZONE R badge */}
                  <span className="netflix-card-n-badge">R</span>

                  {/* Progress bar for continue watching */}
                  {progressPct > 0 && (
                    <div className="netflix-card-progress-bar">
                      <div
                        className="netflix-card-progress-fill"
                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Paddle */}
        <button
          type="button"
          className="netflix-carousel-paddle netflix-carousel-paddle--right"
          onClick={scrollRight}
          aria-label="Next items"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Hover popover for standard cards */}
      {hoveredItem && hoverPos && !isTop10 && (
        <div
          className="netflix-card-hover-popover"
          style={{
            position: "fixed",
            top: Math.max(10, hoverPos.top - 30),
            left: Math.max(10, hoverPos.left - 20),
            width: hoverPos.width * 1.25,
            zIndex: 1000,
          }}
          onMouseEnter={() => clearTimeout(hoverTimeoutRef.current)}
          onMouseLeave={handleCardMouseLeave}
          onClick={() => onSelect(hoveredItem)}
        >
          <div className="netflix-card-poster-wrap">
            <img
              src={imgUrl(hoveredItem.backdrop_path, "w500") || imgUrl(hoveredItem.poster_path, "w342")}
              alt={hoveredItem.title || hoveredItem.name}
              className="netflix-card-poster"
            />
            <span className="netflix-card-n-badge">N</span>
          </div>

          <div className="netflix-hover-content">
            <div className="netflix-hover-actions">
              <div className="netflix-hover-actions-left">
                <button
                  type="button"
                  className="netflix-action-circle netflix-action-circle--play"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(hoveredItem);
                  }}
                  title="Play"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="netflix-action-circle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(hoveredItem);
                  }}
                  title={isSaved && isSaved(hoveredItem) ? "Remove from My List" : "Add to My List"}
                >
                  {isSaved && isSaved(hoveredItem) ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="netflix-action-circle"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title="I like this"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                className="netflix-action-circle"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(hoveredItem);
                }}
                title="More Info"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <div className="netflix-hover-meta">
              <span className="netflix-match-score">
                {hoveredItem.vote_average ? Math.min(99, Math.round(hoveredItem.vote_average * 10) + 2) : 98}% Match
              </span>
              <span className="netflix-age-pill">16+</span>
              <span style={{ color: "#a3a3a3" }}>
                {hoveredItem.media_type === "tv" ? "TV Series" : "Movie"}
              </span>
              <span className="netflix-quality-pill">HD</span>
            </div>

            <div className="netflix-hover-genres">
              <span>Exciting</span>
              <span className="netflix-genre-bullet">•</span>
              <span>Suspenseful</span>
              <span className="netflix-genre-bullet">•</span>
              <span>Popular</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default NetflixRow;
