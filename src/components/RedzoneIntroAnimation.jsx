import { useEffect, useState, useRef } from "react";
import { playTudumSound, resetTudumSound } from "../utils/tudumSound";
import NetflixLogo from "./NetflixLogo";

export default function RedzoneIntroAnimation({ onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [audioTriggered, setAudioTriggered] = useState(false);
  const timerRef = useRef(null);

  const triggerAudio = (force = false) => {
    playTudumSound({ force });
    setAudioTriggered(true);
  };

  useEffect(() => {
    resetTudumSound();

    // 1. Attempt immediate audio playback
    triggerAudio();

    // 2. Attach instant interaction listeners across window to unlock audio instantly on first gesture
    const handleGesture = () => {
      triggerAudio(true);
    };

    window.addEventListener("pointerdown", handleGesture, { passive: true });
    window.addEventListener("touchstart", handleGesture, { passive: true });
    window.addEventListener("click", handleGesture, { passive: true });
    window.addEventListener("keydown", handleGesture, { passive: true });

    // 3. Start fade out at 2.8s
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2800);

    // 4. Fully complete at 3.4s
    timerRef.current = setTimeout(() => {
      onComplete?.();
    }, 3400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(timerRef.current);
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("touchstart", handleGesture);
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, [onComplete]);

  return (
    <div
      className={`redzone-intro-container ${isFadingOut ? "redzone-intro-fade-out" : ""}`}
      onClick={() => triggerAudio(true)}
      role="banner"
      aria-label="REDZONE Intro"
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

      {/* Subtle audio indicator if browser requires tap */}
      {!audioTriggered && (
        <div className="redzone-intro-sound-prompt" onClick={() => triggerAudio(true)}>
          <span>🔊 Tap anywhere for sound</span>
        </div>
      )}
    </div>
  );
}
