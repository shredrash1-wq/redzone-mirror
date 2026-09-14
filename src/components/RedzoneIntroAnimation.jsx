import { useEffect, useState, useRef } from "react";
import { playTudumSound } from "../utils/tudumSound";
import NetflixLogo from "./NetflixLogo";

export default function RedzoneIntroAnimation({ onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Attempt automatic playback immediately
    playTudumSound();

    const tryPlay = () => {
      playTudumSound();
    };

    // Any pointer, touch, mouse movement or key triggers playback if autoplay was restricted
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("touchstart", tryPlay, { once: true });
    window.addEventListener("mousedown", tryPlay, { once: true });
    window.addEventListener("mousemove", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });

    // Start fade out at 2.6s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2600);

    // Fully complete at 3.2s
    timerRef.current = setTimeout(() => {
      onComplete?.();
    }, 3200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(timerRef.current);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("touchstart", tryPlay);
      window.removeEventListener("mousedown", tryPlay);
      window.removeEventListener("mousemove", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, [onComplete]);

  return (
    <div
      className={`redzone-intro-container ${isFadingOut ? "redzone-intro-fade-out" : ""}`}
      onClick={() => playTudumSound()}
    >
      {/* Cinematic Ribbon Lines Effect */}
      <div className="redzone-intro-ribbons" aria-hidden="true">
        <div className="redzone-ribbon redzone-ribbon-1" />
        <div className="redzone-ribbon redzone-ribbon-2" />
        <div className="redzone-ribbon redzone-ribbon-3" />
        <div className="redzone-ribbon redzone-ribbon-4" />
        <div className="redzone-ribbon redzone-ribbon-5" />
      </div>

      {/* Center Cinematic REDZONE Branding */}
      <div className="redzone-intro-logo-wrap">
        <div className="redzone-intro-logo-flare" />
        <NetflixLogo width={320} height={90} className="redzone-intro-logo" />
        <div className="redzone-intro-light-beam" />
      </div>
    </div>
  );
}
