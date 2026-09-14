import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// Web compatibility fallback for electron IPC when running in the browser
if (typeof window !== "undefined" && !window.electron) {
  window.electron = {
    getAppVersion: () => Promise.resolve("2.6.0"),
    getPlatform: () => Promise.resolve("web"),
    onScheduledBackupRequested: () => () => {},
    offScheduledBackupRequested: () => {},
    getScheduledBackupSettings: () => Promise.resolve({}),
    performScheduledBackup: () => Promise.resolve({}),
    showNotification: () => {},
    onConfirmClose: () => () => {},
    offConfirmClose: () => {},
    respondClose: () => {},
    getDownloads: () => Promise.resolve([]),
    deleteDownload: () => Promise.resolve({}),
    pruneSubtitlePaths: () => Promise.resolve({}),
    onDownloadProgress: () => () => {},
    offDownloadProgress: () => {},
    onM3u8Found: () => () => {},
    offM3u8Found: () => {},
    onSubtitleFound: () => () => {},
    offSubtitleFound: () => {},
    checkDownloader: () => Promise.resolve({ status: false, installed: false }),
    runDownload: () => Promise.resolve({ success: false, error: "Downloads are supported in the desktop app." }),
    showInFolder: () => {},
    fileExists: () => Promise.resolve(false),
    scanDirectory: () => Promise.resolve([]),
    pickFolder: () => Promise.resolve(null),
    openExternal: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    openPath: () => {},
    getInstallPath: () => Promise.resolve(null),
    openPathAtTime: () => {},
    searchSubtitles: () => Promise.resolve([]),
    getSubtitleUrl: () => Promise.resolve(null),
    setZoomFactor: () => {},
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
