import { useState, useEffect, useMemo } from "react";
import NetflixHero from "../components/NetflixHero";
import NetflixRow from "../components/NetflixRow";
import { tmdbFetch } from "../utils/api";

const MOVIE_GENRES = [
  { id: "all", name: "All Genres" },
  { id: "28", name: "Action" },
  { id: "35", name: "Comedy" },
  { id: "18", name: "Drama" },
  { id: "27", name: "Horror" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
  { id: "16", name: "Animation" },
];

const TV_GENRES = [
  { id: "all", name: "All Genres" },
  { id: "10759", name: "Action & Adventure" },
  { id: "35", name: "Comedy" },
  { id: "18", name: "Drama" },
  { id: "9648", name: "Mystery" },
  { id: "10765", name: "Sci-Fi & Fantasy" },
  { id: "80", name: "Crime" },
  { id: "16", name: "Animation" },
];

export default function NetflixBrowsePage({
  tab = "home", // 'home' | 'tv' | 'movies' | 'new' | 'my-list'
  trendingMovies = [],
  trendingTV = [],
  inProgress = [],
  savedList = [],
  progress = {},
  apiKey,
  onSelect,
  onPlay,
  onToggleSave,
  isSaved,
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [topRated, setTopRated] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [dramaTV, setDramaTV] = useState([]);
  const [animeList, setAnimeList] = useState([]);

  // Fetch genre specific categories
  useEffect(() => {
    if (!apiKey) return;
    let mounted = true;

    // Top Rated
    tmdbFetch("/movie/top_rated?page=1", apiKey)
      .then((d) => {
        if (mounted && d.results) setTopRated(d.results.slice(0, 15));
      })
      .catch(() => {});

    // Action
    tmdbFetch("/discover/movie?with_genres=28&sort_by=popularity.desc&page=1", apiKey)
      .then((d) => {
        if (mounted && d.results) setActionMovies(d.results.slice(0, 15));
      })
      .catch(() => {});

    // Comedy
    tmdbFetch("/discover/movie?with_genres=35&sort_by=popularity.desc&page=1", apiKey)
      .then((d) => {
        if (mounted && d.results) setComedyMovies(d.results.slice(0, 15));
      })
      .catch(() => {});

    // Drama TV
    tmdbFetch("/discover/tv?with_genres=18&sort_by=popularity.desc&page=1", apiKey)
      .then((d) => {
        if (mounted && d.results) setDramaTV(d.results.slice(0, 15));
      })
      .catch(() => {});

    // Animation / Anime
    tmdbFetch("/discover/tv?with_genres=16&sort_by=popularity.desc&page=1", apiKey)
      .then((d) => {
        if (mounted && d.results) setAnimeList(d.results.slice(0, 15));
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [apiKey]);

  // Determine billboard hero candidate based on active tab
  const heroCandidates = useMemo(() => {
    if (tab === "tv") return trendingTV.slice(0, 5);
    if (tab === "movies") return trendingMovies.slice(0, 5);
    if (tab === "new") return trendingMovies.slice(0, 5);
    return [...trendingMovies.slice(0, 3), ...trendingTV.slice(0, 2)];
  }, [tab, trendingMovies, trendingTV]);

  const activeHero = heroCandidates[heroIndex] || heroCandidates[0] || trendingMovies[0];

  // Rotate billboard hero periodically
  useEffect(() => {
    if (heroCandidates.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroCandidates.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [heroCandidates]);

  // If viewing "My List"
  if (tab === "my-list") {
    return (
      <div className="netflix-search-view">
        <div className="netflix-search-header">
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
            My List
          </h1>
          <p style={{ fontSize: 14, color: "#a3a3a3" }}>
            Titles you've saved to watch anytime.
          </p>
        </div>

        {savedList.length === 0 ? (
          <div className="netflix-search-empty">
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
            <p style={{ fontSize: 18, color: "#ffffff", marginBottom: 8 }}>
              Your list is currently empty
            </p>
            <p style={{ fontSize: 14, color: "#777777" }}>
              Explore movies and TV shows, then click the '+' button to add titles to your list.
            </p>
          </div>
        ) : (
          <div className="netflix-search-grid">
            {savedList.map((item) => (
              <div
                key={`${item.media_type}_${item.id}`}
                className="netflix-card"
                onClick={() => onSelect(item)}
                style={{ width: "100%", flex: "none" }}
              >
                <div className="netflix-card-poster-wrap">
                  <img
                    src={
                      item.backdrop_path
                        ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
                        : `https://image.tmdb.org/t/p/w342${item.poster_path}`
                    }
                    alt={item.title || item.name}
                    className="netflix-card-poster"
                  />
                  <span className="netflix-card-n-badge">R</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                    {item.title || item.name}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(item);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ff4d4f",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    title="Remove from My List"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="netflix-browse-container">
      {/* Category sub-header with genre dropdown if TV or Movies tab */}
      {(tab === "tv" || tab === "movies") && (
        <div
          style={{
            position: "absolute",
            top: 76,
            left: "4%",
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", margin: 0 }}>
            {tab === "tv" ? "TV Shows" : "Movies"}
          </h1>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 3,
              padding: "5px 12px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {(tab === "tv" ? TV_GENRES : MOVIE_GENRES).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Netflix Hero Billboard */}
      {activeHero && (
        <NetflixHero
          item={activeHero}
          onPlay={onPlay}
          onMoreInfo={onSelect}
          ageRating={activeHero.media_type === "tv" ? "TV-MA" : "16+"}
        />
      )}

      {/* Content Rows */}
      <div className="netflix-rows-container">
        {/* Continue Watching Row if user has in-progress items */}
        {inProgress.length > 0 && (
          <NetflixRow
            title="Continue Watching"
            items={inProgress}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}

        {/* Top 10 in Movies / Series Today with giant 1..10 numbers! */}
        <NetflixRow
          title={tab === "tv" ? "Top 10 TV Shows in the U.S. Today" : "Top 10 Movies in the U.S. Today"}
          items={(tab === "tv" ? trendingTV : trendingMovies).slice(0, 10)}
          onSelect={onSelect}
          onPlay={onPlay}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
          isTop10={true}
        />

        {/* Trending Now */}
        <NetflixRow
          title="Trending Now"
          items={tab === "tv" ? trendingTV : trendingMovies}
          onSelect={onSelect}
          onPlay={onPlay}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
          progressMap={progress}
        />

        {/* Popular TV Shows (shown on Home, TV, and New) */}
        {(tab === "home" || tab === "tv" || tab === "new") && (
          <NetflixRow
            title="Popular on REDZONE"
            items={trendingTV}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}

        {/* Top Rated Blockbusters */}
        {topRated.length > 0 && (
          <NetflixRow
            title="Critically Acclaimed Blockbusters"
            items={topRated}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}

        {/* Action & Adventure */}
        {actionMovies.length > 0 && (
          <NetflixRow
            title="Action & Adventure"
            items={actionMovies}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}

        {/* Comedies */}
        {comedyMovies.length > 0 && (
          <NetflixRow
            title="Comedies & Feel-Good Movies"
            items={comedyMovies}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}

        {/* Dramatic Series */}
        {dramaTV.length > 0 && (
          <NetflixRow
            title="Binge-Worthy TV Dramas"
            items={dramaTV}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}

        {/* Anime & Animation */}
        {animeList.length > 0 && (
          <NetflixRow
            title="Anime & Animation"
            items={animeList}
            onSelect={onSelect}
            onPlay={onPlay}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            progressMap={progress}
          />
        )}
      </div>
    </div>
  );
}
