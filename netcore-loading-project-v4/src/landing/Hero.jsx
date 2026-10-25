import site from "./site.config.js";

export default function Hero() {
  const h = site.hero;
  return (
    <section className="hero" id="hero">
      <div className="wrap">
        <p className="eyebrow">{h.eyebrow}</p>
        <h1 className="hero-title">{h.headline}</h1>
        <p className="hero-tagline">{h.tagline}</p>
        <div className="hero-actions">
          <a className="btn btn-primary" href={h.primaryButton.href}>{h.primaryButton.label}</a>
          <a className="btn btn-ghost" href={h.secondaryButton.href}>{h.secondaryButton.label}</a>
        </div>
        {h.meta.length > 0 && (
          <dl className="hero-meta">
            {h.meta.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
