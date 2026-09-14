import { useState, useEffect } from "react";
import { tmdbFetch, imgUrl } from "../utils/api";

const POPULAR_SEARCHES = [
  "Stranger Things",
  "Breaking Bad",
  "Wednesday",
  "Squid Game",
  "Avatar",
  "One Piece",
  "Oppenheimer",
  "The Witcher",
  "Cyberpunk",
  "Spider-Man",
  "Interstellar",
  "Inception",
];

export default function NetflixSearchPage({
  query = "",
  setQuery,
  apiKey,
  onSelect,
  onPlay,
  onToggleSave,
  isSaved,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'movie' | 'tv' | 'top_rated'
  const [results, setResults] = useState([]);
  const [trendingResults, setTrendingResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch trending titles for empty search state
  useEffect(() => {
    if (!apiKey) return;
    tmdbFetch("/trending/all/day", apiKey)
      .then((data) => {
        if (data.results) {
          setTrendingResults(
            data.results.filter((r) => r.media_type !== "person").slice(0, 18),
          );
        }
      })
      .catch(() => {});
  }, [apiKey]);

  // Real-time search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await tmdbFetch(
          `/search/multi?query=${encodeURIComponent(query)}&page=1`,
          apiKey,
        );
        if (mounted) {
          const valid = (data.results || []).filter(
            (r) => r.media_type !== "person" && (r.poster_path || r.backdrop_path),
          );
          setResults(valid);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }, 280);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, apiKey]);

  // Filter items based on active chip
  const displayedItems = (query.trim() ? results : trendingResults).filter(
    (item) => {
      if (filter === "all") return true;
      if (filter === "movie") return item.media_type === "movie";
      if (filter === "tv") return item.media_type === "tv";
      if (filter === "top_rated") return (item.vote_average || 0) >= 7.5;
      return true;
    },
  );

  return (
    <div className="netflix-search-view">
      <div className="netflix-search-header">
        {query ? (
          <div>
            <div style={{ fontSize: 14, color: "#a3a3a3", marginBottom: 6 }}>
              Explore titles related to: <strong style={{ color: "#ffffff" }}>{query}</strong>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>
              Popular Searches
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="netflix-search-chip"
                  onClick={() => setQuery(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Chips */}
        <div className="netflix-search-tags">
          <span className="netflix-search-tag-label">Filter:</span>
          <button
            type="button"
            className={`netflix-search-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`netflix-search-chip ${filter === "movie" ? "active" : ""}`}
            onClick={() => setFilter("movie")}
          >
            Movies
          </button>
          <button
            type="button"
            className={`netflix-search-chip ${filter === "tv" ? "active" : ""}`}
            onClick={() => setFilter("tv")}
          >
            TV Shows
          </button>
          <button
            type="button"
            className={`netflix-search-chip ${filter === "top_rated" ? "active" : ""}`}
            onClick={() => setFilter("top_rated")}
          >
            ★ Top Rated
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid rgba(255,255,255,0.2)",
              borderTopColor: "var(--netflix-red)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      ) : displayedItems.length > 0 ? (
        <div className="netflix-search-grid">
          {displayedItems.map((item) => {
            const isTV = item.media_type === "tv";
            const title = item.title || item.name;
            const year = (item.release_date || item.first_air_date || "").slice(0, 4);
            const image = imgUrl(item.backdrop_path, "w500") || imgUrl(item.poster_path, "w342");
            const matchScore = item.vote_average
              ? Math.min(99, Math.round(item.vote_average * 10) + 2)
              : 97;

            return (
              <div
                key={item.id}
                className="netflix-card"
                onClick={() => onSelect(item)}
                style={{ width: "100%", flex: "none" }}
              >
                <div className="netflix-card-poster-wrap">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      className="netflix-card-poster"
                      loading="lazy"
                    />
                  ) : (
                    <div className="netflix-card-title-fallback">{title}</div>
                  )}
                  <span className="netflix-card-n-badge">R</span>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#a3a3a3",
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <span className="netflix-match-score">{matchScore}%</span>
                    <span>{year}</span>
                    <span className="netflix-age-pill">{isTV ? "TV" : "HD"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : query ? (
        <div className="netflix-search-empty">
          <p style={{ fontSize: 18, color: "#ffffff", marginBottom: 12 }}>
            Your search for "{query}" did not have any matches.
          </p>
          <p style={{ fontSize: 14, color: "#777777", lineHeight: 1.6 }}>
            Suggestions:
            <br />
            • Try different keywords
            <br />
            • Looking for a movie or TV show? Try using a movie, TV show title, actor, or genre.
          </p>
        </div>
      ) : null}
    </div>
  );
}
