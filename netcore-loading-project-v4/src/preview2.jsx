// PREVIEW ONLY (not part of the real site): runs the loading screen, then the
// landing page, on one page so both can be previewed together. In the real
// project these are two pages and the loader redirects with window.location.
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/michroma/400.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./App.css";
import "./landing/landing.css";
import "./preview.css";
import LoadingScreen from "./App.jsx";
import Landing from "./landing/Landing.jsx";
import loader from "./loader.js";
import { startSampleLoad } from "./sampleData.js";

document.documentElement.dataset.theme = "dark";

const startDemo = () => {
  loader.reset();
  startSampleLoad(loader);
};
startDemo();

function Preview() {
  const [stage, setStage] = useState("loading");
  const [run, setRun] = useState(0);

  // the Projects page doesn't exist yet: keep its links from leaving the preview
  useEffect(() => {
    const stop = (e) => {
      const a = e.target.closest?.("a[href$='.html']");
      if (a) e.preventDefault();
    };
    document.addEventListener("click", stop);
    return () => document.removeEventListener("click", stop);
  }, []);

  const replay = () => {
    startDemo();
    setStage("loading");
    setRun((n) => n + 1);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {stage === "loading" ? (
        <LoadingScreen key={run} onComplete={() => setStage("site")} />
      ) : (
        <Landing />
      )}
      <button id="replay" className="replay" onClick={replay}>Replay intro</button>
    </>
  );
}

createRoot(document.getElementById("root")).render(<Preview />);
