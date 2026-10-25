import "@fontsource/michroma/400.css";
import "./LoadingSystem.css";
import defaultConfig from "./netcore.config.js";
import defaultLoader from "./loader.js";
import useLoaderProgress from "./useLoaderProgress.js";

export default function LoadingSystem({
  config = defaultConfig,
  loader = defaultLoader,
  onComplete
}) {
  const { text: T, colors: C, loading } = config;
  const progress = useLoaderProgress(loader, loading, onComplete);

  const style = {
    "--progress": `${progress}%`,
    "--nc-outline": T.outline,
    "--nc-fill": T.fill,
    "--nc-fill-end": T.fillEnd,
    "--nc-glow": T.glow,
    "--nc-spacing": `${T.letterSpacing}em`,
    "--nc-font": T.fontFamily,
    "--nc-size": `clamp(${T.minPx}px, ${T.sizeVw}vw, ${T.maxPx}px)`,
    top: `${T.topY * 100}%`
  };

  return (
    <section className="loading-system" style={style}>
      <h1 className="loading-word" aria-label={`${T.word} ${progress}%`}>
        <span className="loading-outline">{T.word}</span>
        <span className="loading-fill" aria-hidden="true">{T.word}</span>
      </h1>

      {T.showPercent && (
        <div className="loading-percentage">
          <span />
          <p>{progress}%</p>
          <span />
        </div>
      )}
    </section>
  );
}
