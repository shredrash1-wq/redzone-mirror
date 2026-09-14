import { useState, useEffect } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";

export default function NetflixDetailModal({
  item,
  apiKey,
  onClose,
  onPlay,
  onToggleSave,
  isSaved,
}) {
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  if (!item) return null;

  const isTV = item.media_type === "tv" || !item.release_date;
  const mediaType = isTV ? "tv" : "movie";
  const title = item.title || item.name || details?.title || details?.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const backdrop = imgUrl(item.backdrop_path, "original") || imgUrl(item.poster_path, "original");
  const matchScore = item.vote_average ? Math.min(99, Math.round(item.vote_average * 10) + 2) : 98;

  // Fetch full details & credits
  useEffect(() => {
    if (!item?.id || !apiKey) return;
    let mounted = true;

    // Fetch primary details
    tmdbFetch(`/${mediaType}/${item.id}`, apiKey)
      .then((data) => {
        if (mounted) setDetails(data);
      })
      .catch(() => {});

    // Fetch credits
    tmdbFetch(`/${mediaType}/${item.id}/credits`, apiKey)
      .then((data) => {
        if (mounted) setCredits(data);
      })
      .catch(() => {});

    // Fetch recommendations
    tmdbFetch(`/${mediaType}/${item.id}/recommendations`, apiKey)
      .then((data) => {
        if (mounted && data.results) {
          setSimilar(data.results.slice(0, 9));
        }
      })
      .catch(() => {
        // Fallback to similar
        tmdbFetch(`/${mediaType}/${item.id}/similar`, apiKey)
          .then((d) => {
            if (mounted && d.results) setSimilar(d.results.slice(0, 9));
          })
          .catch(() => {});
      });

    return () => {
      mounted = false;
    };
  }, [item.id, mediaType, apiKey]);

  // Fetch TV episodes when season changes
  useEffect(() => {
    if (!isTV || !item?.id || !apiKey) return;
    let mounted = true;
    setLoadingEpisodes(true);

    tmdbFetch(`/tv/${item.id}/season/${selectedSeason}`, apiKey)
      .then((data) => {
        if (mounted) {
          setSeasonEpisodes(data.episodes || []);
          setLoadingEpisodes(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingEpisodes(false);
      });

    return () => {
      mounted = false;
    };
  }, [isTV, item.id, selectedSeason, apiKey]);

  const castNames = (credits?.cast || [])
    .slice(0, 5)
    .map((c) => c.name)
    .join(", ");

  const genresNames = (details?.genres || item.genres || [])
    .map((g) => g.name)
    .join(", ");

  const seasonsList = details?.seasons?.filter((s) => s.season_number > 0) || [];

  return (
    <div
      className="netflix-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="netflix-modal-container">
        {/* Close Button */}
        <button
          type="button"
          className="netflix-modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Hero Banner */}
        <div className="netflix-modal-hero">
          <img
            src={backdrop}
            alt={title}
            className="netflix-modal-hero-img"
          />
          <div className="netflix-modal-hero-gradient" />

          <div className="netflix-modal-hero-actions">
            <div>
              <h2 className="netflix-modal-title">{title}</h2>
              <div className="netflix-modal-hero-actions-left">
                <button
                  type="button"
                  className="netflix-btn-play"
                  onClick={() => {
                    onClose();
                    onPlay(item);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Play
                </button>

                <button
                  type="button"
                  className="netflix-action-circle"
                  onClick={() => onToggleSave(item)}
                  title={isSaved ? "Remove from My List" : "Add to My List"}
                >
                  {isSaved ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>

                <button
                  type="button"
                  className="netflix-action-circle"
                  title="I like this"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="netflix-modal-body">
          <div className="netflix-modal-grid">
            {/* Left Column: Metadata and Overview */}
            <div>
              <div className="netflix-modal-meta-row">
                <span className="netflix-match-score">{matchScore}% Match</span>
                {year && <span className="netflix-year">{year}</span>}
                <span className="netflix-age-pill">{isTV ? "TV-MA" : "16+"}</span>
                {details?.runtime && (
                  <span style={{ color: "#a3a3a3", fontSize: 13 }}>
                    {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                  </span>
                )}
                {details?.number_of_seasons && (
                  <span style={{ color: "#a3a3a3", fontSize: 13 }}>
                    {details.number_of_seasons} Season{details.number_of_seasons > 1 ? "s" : ""}
                  </span>
                )}
                <span className="netflix-quality-pill">HD</span>
                <span className="netflix-quality-pill">4K</span>
              </div>

              <p className="netflix-modal-overview">
                {details?.overview || item.overview || "No description available for this title."}
              </p>
            </div>

            {/* Right Column: Cast & Genres */}
            <div className="netflix-modal-specs">
              {castNames && (
                <div className="netflix-modal-specs-item" style={{ marginBottom: 12 }}>
                  <span>Cast:</span>
                  <span>{castNames}</span>
                </div>
              )}
              {genresNames && (
                <div className="netflix-modal-specs-item" style={{ marginBottom: 12 }}>
                  <span>Genres:</span>
                  <span>{genresNames}</span>
                </div>
              )}
              <div className="netflix-modal-specs-item">
                <span>This title is:</span>
                <span>Suspenseful, Exciting, Atmospheric</span>
              </div>
            </div>
          </div>

          {/* TV Shows Episodes Section */}
          {isTV && (
            <div className="netflix-episodes-section">
              <div className="netflix-episodes-header">
                <h3 className="netflix-episodes-title">Episodes</h3>
                {seasonsList.length > 0 && (
                  <select
                    className="netflix-season-select"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  >
                    {seasonsList.map((s) => (
                      <option key={s.id} value={s.season_number}>
                        {s.name} ({s.episode_count} Episodes)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {loadingEpisodes ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "#a3a3a3" }}>
                  Loading episodes…
                </div>
              ) : (
                <div className="netflix-episodes-list">
                  {seasonEpisodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="netflix-episode-row"
                      onClick={() => {
                        onClose();
                        onPlay(item, { season: selectedSeason, episode: ep.episode_number });
                      }}
                    >
                      <div className="netflix-episode-num">{ep.episode_number}</div>
                      <div className="netflix-episode-thumb-wrap">
                        <img
                          src={imgUrl(ep.still_path, "w300") || backdrop}
                          alt={ep.name}
                          className="netflix-episode-thumb"
                          loading="lazy"
                        />
                        <div className="netflix-episode-play-overlay">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>
                      <div className="netflix-episode-info">
                        <div className="netflix-episode-top">
                          <span className="netflix-episode-name">{ep.name}</span>
                          {ep.runtime && (
                            <span className="netflix-episode-duration">{ep.runtime}m</span>
                          )}
                        </div>
                        <p className="netflix-episode-desc">{ep.overview || "No episode summary available."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* More Like This Recommendations */}
          {similar.length > 0 && (
            <div className="netflix-more-like-this">
              <h3 className="netflix-more-title">More Like This</h3>
              <div className="netflix-more-grid">
                {similar.map((sim) => (
                  <div
                    key={sim.id}
                    className="netflix-more-card"
                    onClick={() => {
                      onClose();
                      onPlay(sim);
                    }}
                  >
                    <img
                      src={imgUrl(sim.backdrop_path, "w500") || imgUrl(sim.poster_path, "w342")}
                      alt={sim.title || sim.name}
                      className="netflix-more-card-img"
                      loading="lazy"
                    />
                    <div className="netflix-more-card-body">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span className="netflix-match-score">
                          {sim.vote_average ? Math.min(99, Math.round(sim.vote_average * 10) + 2) : 96}% Match
                        </span>
                        <span className="netflix-age-pill">16+</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 4 }}>
                        {sim.title || sim.name}
                      </div>
                      <p className="netflix-more-card-desc">{sim.overview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
