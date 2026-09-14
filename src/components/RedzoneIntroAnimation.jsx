import { useEffect, useState, useRef } from "react";
import { playTudumSound } from "../utils/tudumSound";
import NetflixLogo from "./NetflixLogo";

export default function RedzoneIntroAnimation({ onComplete }) {
  const [hasStartedAudio, setHasStartedAudio] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timerRef = useRef(null);

  const startSoundAndTimer = () => {
    if (!hasStartedAudio) {
      playTudumSound();
      setHasStartedAudio(true);
    }
  };

  useEffect(() => {
    // Attempt automatic playback
    startSoundAndTimer();

    // Start fade out at 2.7s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2700);

    // Fully complete at 3.3s
    timerRef.current = setTimeout(() => {
      onComplete?.();
    }, 3300);

    const handleInteraction = () => {
      startSoundAndTimer();
    };

    window.addEventListener("pointerdown", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(timerRef.current);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [onComplete]);

  return (
    <div
      className={`redzone-intro-container ${isFadingOut ? "redzone-intro-fade-out" : ""}`}
      onClick={startSoundAndTimer}
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
