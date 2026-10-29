import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Same bundled fonts as the landing page, so both pages match.
import "@fontsource/michroma/400.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "../App.css"; // styles of the loading screen shown while the projects load
import loader from "../loader.js";
import { startRealLoad } from "../startLoad.js";
import NeuralProjects from "./NeuralProjects.jsx";

// Start the real work first (Firestore projects + first covers); the loading screen follows it.
startRealLoad(loader);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NeuralProjects />
  </StrictMode>
);
