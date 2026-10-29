import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Same bundled fonts as the landing page.
import "@fontsource/michroma/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "../shared/ui.css";
import AuthPage from "./AuthPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthPage />
  </StrictMode>
);
