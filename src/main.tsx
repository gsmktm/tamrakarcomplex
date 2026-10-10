import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installChunkLoadRecovery } from "@/lib/chunkLoadRecovery";

installChunkLoadRecovery();

// Register the service worker only in production (dev HMR + SW = stale-module
// headaches). Registration is silent and never blocks rendering.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is progressive enhancement — never fail the app.
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
