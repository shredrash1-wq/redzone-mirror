import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Android TV / Universal Remote Virtual Mouse Cursor
 * 
 * Provides a virtual mouse pointer controlled via:
 * - Remote D-Pad (Up, Down, Left, Right)
 * - Gamepad stick / D-pad
 * - Keyboard arrow keys
 * - OK / Center / Enter / Select button for clicking
 * 
 * When ON: Displays high-visibility cursor with precision acceleration and auto-scrolling
 * When OFF: Completely removed from the DOM ("use normal by remove") for standard focus navigation
 */
export default function VirtualCursor({ enabled = false, onToggle }) {
  const [pos, setPos] = useState(() => ({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 640,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 360,
  }));
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [clickRipple, setClickRipple] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  const posRef = useRef(pos);
  posRef.current = pos;

  const keysPressedRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const speedRef = useRef(4);
  const animFrameRef = useRef(null);
  const notifTimerRef = useRef(null);

  // Show notification banner on activate
  useEffect(() => {
    if (enabled) {
      setShowNotification(true);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      notifTimerRef.current = setTimeout(() => {
        setShowNotification(false);
      }, 3500);
    } else {
      setShowNotification(false);
    }
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, [enabled]);

  // Click execution at current cursor position
  const triggerClick = useCallback(() => {
    const { x, y } = posRef.current;
    setIsClicking(true);

    // Ripple visual effect
    setClickRipple({ id: Date.now(), x, y });
    setTimeout(() => setClickRipple(null), 400);

    // Find targeted element
    const el = document.elementFromPoint(x, y);
    if (el) {
      // Find nearest clickable container or button
      const clickable = el.closest(
        'button, a, input, select, textarea, [role="button"], .netflix-card, .netflix-nav-btn, .redzone-player-control-btn, .media-card'
      ) || el;

      clickable.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX: x, clientY: y })
      );
      clickable.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true, clientX: x, clientY: y })
      );
      clickable.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y })
      );

      if (clickable.focus && typeof clickable.focus === "function") {
        clickable.focus();
      }
    }

    setTimeout(() => setIsClicking(false), 150);
  }, []);

  // Update hover state
  const checkHover = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) {
      setIsHovering(false);
      return;
    }
    const isInteractive = Boolean(
      el.closest('button, a, input, select, textarea, [role="button"], .netflix-card, .netflix-nav-btn, .redzone-player-control-btn, .media-card, [tabindex]')
    );
    setIsHovering(isInteractive);
  }, []);

  // 60FPS physics loop for smooth cursor movement & edge auto-scroll
  useEffect(() => {
    if (!enabled) return;

    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - lastTime) / 16.666, 2.5);
      lastTime = now;

      const keys = keysPressedRef.current;
      const isMoving = keys.up || keys.down || keys.left || keys.right;

      if (isMoving) {
        // Accelerate smoothly from precision speed (4px) up to travel speed (18px)
        speedRef.current = Math.min(speedRef.current + 0.5 * dt, 18);

        let dx = 0;
        let dy = 0;
        if (keys.left) dx -= speedRef.current * dt;
        if (keys.right) dx += speedRef.current * dt;
        if (keys.up) dy -= speedRef.current * dt;
        if (keys.down) dy += speedRef.current * dt;

        // Normalise diagonal movement
        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        const current = posRef.current;
        const newX = Math.max(8, Math.min(window.innerWidth - 12, current.x + dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 12, current.y + dy));

        posRef.current = { x: newX, y: newY };
        setPos({ x: newX, y: newY });
        checkHover(newX, newY);

        // Edge Auto-scroll for TV pages
        const scrollThreshold = 80;
        if (newY < scrollThreshold) {
          window.scrollBy({ top: -14 * dt, behavior: "auto" });
        } else if (newY > window.innerHeight - scrollThreshold) {
          window.scrollBy({ top: 14 * dt, behavior: "auto" });
        }
      } else {
        speedRef.current = 4;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled, checkHover]);

  // Key event listeners for Android TV & Remote D-pad
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Toggle cursor shortcut: 'C' key when not typing
      if (e.key === "c" || e.key === "C") {
        const tag = (e.target?.tagName || "").toUpperCase();
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          onToggle?.();
          return;
        }
      }

      // Android TV / Remote keycodes
      // 19: DPAD_UP, 38: ArrowUp
      // 20: DPAD_DOWN, 40: ArrowDown
      // 21: DPAD_LEFT, 37: ArrowLeft
      // 22: DPAD_RIGHT, 39: ArrowRight
      // 13: Enter, 23: DPAD_CENTER, 66: KEYCODE_ENTER
      const code = e.keyCode || e.which;

      if (e.key === "ArrowUp" || code === 19 || code === 38) {
        e.preventDefault();
        keysPressedRef.current.up = true;
      } else if (e.key === "ArrowDown" || code === 20 || code === 40) {
        e.preventDefault();
        keysPressedRef.current.down = true;
      } else if (e.key === "ArrowLeft" || code === 21 || code === 37) {
        e.preventDefault();
        keysPressedRef.current.left = true;
      } else if (e.key === "ArrowRight" || code === 22 || code === 39) {
        e.preventDefault();
        keysPressedRef.current.right = true;
      } else if (e.key === "Enter" || code === 13 || code === 23 || code === 66) {
        e.preventDefault();
        triggerClick();
      }
    };

    const handleKeyUp = (e) => {
      const code = e.keyCode || e.which;
      if (e.key === "ArrowUp" || code === 19 || code === 38) {
        keysPressedRef.current.up = false;
      } else if (e.key === "ArrowDown" || code === 20 || code === 40) {
        keysPressedRef.current.down = false;
      } else if (e.key === "ArrowLeft" || code === 21 || code === 37) {
        keysPressedRef.current.left = false;
      } else if (e.key === "ArrowRight" || code === 22 || code === 39) {
        keysPressedRef.current.right = false;
      }
    };

    // Track mouse position if a physical air-mouse is moved
    const handleMouseMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
      checkHover(e.clientX, e.clientY);
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: false });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [enabled, onToggle, triggerClick, checkHover]);

  // Gamepad poll loop for TV controllers
  useEffect(() => {
    if (!enabled) return;

    let gamepadLoopId;
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        const deadzone = 0.25;
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;

        // D-Pad buttons: 12 (up), 13 (down), 14 (left), 15 (right)
        const dpadUp = gp.buttons[12]?.pressed;
        const dpadDown = gp.buttons[13]?.pressed;
        const dpadLeft = gp.buttons[14]?.pressed;
        const dpadRight = gp.buttons[15]?.pressed;

        keysPressedRef.current.up = dpadUp || axisY < -deadzone;
        keysPressedRef.current.down = dpadDown || axisY > deadzone;
        keysPressedRef.current.left = dpadLeft || axisX < -deadzone;
        keysPressedRef.current.right = dpadRight || axisX > deadzone;

        // Button A (0) triggers click
        if (gp.buttons[0]?.pressed && !isClicking) {
          triggerClick();
        }
      }
      gamepadLoopId = requestAnimationFrame(pollGamepad);
    };

    gamepadLoopId = requestAnimationFrame(pollGamepad);
    return () => {
      if (gamepadLoopId) cancelAnimationFrame(gamepadLoopId);
    };
  }, [enabled, isClicking, triggerClick]);

  // When disabled, return null -> completely removed from DOM
  if (!enabled) {
    return null;
  }

  return (
    <div className="redzone-virtual-cursor-layer" aria-hidden="true">
      {/* Toast tip on activation */}
      {showNotification && (
        <div className="redzone-cursor-mode-toast">
          <span className="redzone-cursor-toast-icon">🖱️</span>
          <div>
            <div className="redzone-cursor-toast-title">Mouse Pointer Mode ON</div>
            <div className="redzone-cursor-toast-sub">Use Remote D-pad arrows to glide • OK to click • Press C to disable</div>
          </div>
          <button
            type="button"
            className="redzone-cursor-toast-close"
            onClick={() => setShowNotification(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Click ripple animation */}
      {clickRipple && (
        <div
          className="redzone-cursor-click-ripple"
          style={{
            left: `${clickRipple.x}px`,
            top: `${clickRipple.y}px`,
          }}
        />
      )}

      {/* Modern High-Visibility Mouse Pointer */}
      <div
        className={`redzone-virtual-mouse-pointer ${isHovering ? "hovering" : ""} ${isClicking ? "clicking" : ""}`}
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          className="redzone-cursor-svg"
        >
          {/* Outer glow shadow */}
          <path
            d="M5 2L13 22L17 15L24 13L5 2Z"
            fill="rgba(0, 0, 0, 0.6)"
            transform="translate(1, 1)"
          />
          {/* Pointer Body: Bright white with redzone accent tip */}
          <path
            d="M5 2L13 22L17 15L24 13L5 2Z"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Core Accent Dot/Line */}
          <polygon
            points="7,5 12,18 15,13 20,11"
            fill={isHovering ? "#E50914" : "#ff3b47"}
          />
        </svg>

        {/* Hover target indicator halo */}
        {isHovering && <span className="redzone-cursor-hover-halo" />}
      </div>
    </div>
  );
}
