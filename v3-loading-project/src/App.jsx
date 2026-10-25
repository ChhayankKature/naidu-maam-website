import { useState } from "react";
import NetworkGlobe from "./NetworkGlobe.jsx";
import LoadingSystem from "./LoadingSystem.jsx";
import defaultConfig from "./netcore.config.js";
import defaultLoader from "./loader.js";

// The whole loading screen. Drop it into your landing page:
//
//   <LoadingScreen onComplete={() => setReady(true)} />
//
// Register what must finish first with loader.track(...) (see README).
export default function LoadingScreen({
  config = defaultConfig,
  loader = defaultLoader,
  onComplete,
  fadeOut = config.loading.fadeOut
}) {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  const finish = () => {
    setDone(true);
    if (fadeOut) {
      setTimeout(() => {
        setGone(true);
        onComplete?.();
      }, config.loading.fadeMs);
    } else {
      onComplete?.();
    }
  };

  if (gone) return null;

  return (
    <main
      className={`boot-screen${done && fadeOut ? " is-done" : ""}`}
      style={{
        "--nc-bg": config.colors.background,
        "--nc-scan": config.holo.screenScanlines,
        "--nc-fade": `${config.loading.fadeMs}ms`
      }}
    >
      <NetworkGlobe config={config} />
      <LoadingSystem config={config} loader={loader} onComplete={finish} />
    </main>
  );
}
