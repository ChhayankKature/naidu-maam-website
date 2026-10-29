import site from "./site.config.js";

export default function About() {
  const a = site.about;
  if (!a.show) return null;
  return (
    <section className="section" id={a.id}>
      <div className="wrap">
        <p className="section-label">{a.label}</p>
        <h2 className="section-title">{a.heading}</h2>
        <div className="about-grid">
          <div className="about-text">
            {a.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <dl className="facts">
            {a.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {a.skills.length > 0 && (
          <ul className="chips" aria-label="Skills">
            {a.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
