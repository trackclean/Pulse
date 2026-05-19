import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable the default browser right-click context menu in production builds.
// In dev mode we keep it enabled for debugging convenience.
if (!import.meta.env.DEV) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

createRoot(document.getElementById("root")!).render(<App />);
