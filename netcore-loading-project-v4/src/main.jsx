import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LoadingScreen from "./App.jsx";
import loader from "./loader.js";
import config from "./netcore.config.js";
import { startSampleLoad } from "./sampleData.js";
import "./App.css";

// Demo only: pretend three pieces of data take a while to arrive.
// Replace these with your real requests, e.g. loader.track(fetch("/api/..."))
// SAMPLE DATA: remove when real data is connected (see sampleData.js)
startSampleLoad(loader);

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
