import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LoadingScreen from "./App.jsx";
import loader from "./loader.js";
import config from "./netcore.config.js";
import { startRealLoad } from "./startLoad.js";
import "./App.css";

// What the loading bar follows (real work, see startLoad.js):
//   - the published projects from Firestore, then their first cover images
//   - the landing page itself, so the jump to it is instant
//   - page load and fonts (tracked automatically)
startRealLoad(loader);
if (config.loading.redirect) loader.trackAssets([config.loading.redirect]);

// When loading reaches 100% and the screen has faded out, open the site
// in this same tab. replace() keeps the loader out of the back-button history.
const goToSite = () => {
  if (config.loading.redirect) window.location.replace(config.loading.redirect);
};

// Download the next page in the background while loading runs, so the jump is instant.
if (config.loading.redirect) {
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = config.loading.redirect;
  document.head.appendChild(link);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LoadingScreen onComplete={goToSite} />
  </StrictMode>
);
