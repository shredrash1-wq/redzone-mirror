import { useState, useEffect } from "react";

// Only rendered on Windows (platform === 'win32')
// Provides minimize / maximize / close buttons and a draggable title area.
export default function WindowTitlebar() {
  const [maximized, setMaximized] = useState(false);

  // Defined outside useEffect so toggleMaximize can also call it.
  // Syncs both React state and the html[data-maximized] attribute together.
  const apply = (v) => {
    setMaximized(v);
    if (v) {
      document.documentElement.setAttribute("data-maximized", "1");
    } else {
      document.documentElement.removeAttribute("data-maximized");
    }
  };

  useEffect(() => {
    if (!window.electron) return;

    window.electron.windowIsMaximized?.().then(apply);
    const handler = window.electron.onWindowMaximize?.(apply);

    return () => {
      window.electron.offWindowMaximize?.(handler);
      document.documentElement.removeAttribute("data-maximized");
    };
  }, []);

  const minimize = () => window.electron?.windowMinimize();
  const toggleMaximize = () => window.electron?.windowToggleMaximize();
  const close = () => window.electron?.windowClose();

  return (
    <div
      className="window-titlebar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 32,
        zIndex: 10000,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        userSelect: "none",
        // WebkitAppRegion makes the bar draggable in Electron
        WebkitAppRegion: "drag",
      }}
    >
      {/* App name / logo */}
      <div
        style={{
          paddingLeft: 14,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 2.5,
          fontFamily: "var(--font-display)",
          flexGrow: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--red, #ff1a40)",
            boxShadow: "0 0 8px #ff1a40",
            display: "inline-block",
          }}
        />
        <span style={{ color: "var(--red, #ff1a40)", textShadow: "0 0 12px rgba(255,26,64,0.7)" }}>
          REDZONE
        </span>
        <span style={{ color: "#e2e8f0", letterSpacing: 3, fontWeight: 600 }}>
          MIRROR
        </span>
        <span
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 3,
            background: "rgba(255, 26, 64, 0.15)",
            border: "1px solid rgba(255, 26, 64, 0.35)",
            color: "var(--red, #ff1a40)",
            letterSpacing: 1,
            marginLeft: 4,
          }}
        >
          v2.6
        </span>
      </div>

      {/* Window control buttons, NOT draggable */}
      <div
        style={{
          display: "flex",
          height: "100%",
          WebkitAppRegion: "no-drag",
        }}
      >
        {/* Minimize */}
        <TitlebarBtn
          onClick={minimize}
          hoverBg="color-mix(in srgb, var(--text) 10%, transparent)"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </TitlebarBtn>

        {/* Maximize / Restore */}
        <TitlebarBtn
          onClick={toggleMaximize}
          hoverBg="color-mix(in srgb, var(--text) 10%, transparent)"
          title={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? (
            // Restore icon (two overlapping squares)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect
                x="2"
                y="0"
                width="8"
                height="8"
                rx="0.5"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
              <rect
                x="0"
                y="2"
                width="8"
                height="8"
                rx="0.5"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                style={{ fill: "var(--bg)" }}
              />
            </svg>
          ) : (
            // Maximize icon (square)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                rx="0.5"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          )}
        </TitlebarBtn>

        {/* Close */}
        <TitlebarBtn
          onClick={close}
          hoverBg="rgba(229,9,20,0.85)"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line
              x1="0"
              y1="0"
              x2="10"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="10"
              y1="0"
              x2="0"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </TitlebarBtn>
      </div>
    </div>
  );
}

function TitlebarBtn({ children, onClick, hoverBg, title }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46,
        height: "100%",
        background: hovered ? hoverBg : "transparent",
        border: "none",
        cursor: "default",
        color: hovered ? "var(--text)" : "var(--text3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
