import { useState } from "react";
import site from "./site.config.js";

export default function Contact() {
  const c = site.contact;
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  if (!c.show) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));

    // No endpoint set: open the visitor's email app with the message filled in.
    if (!c.formEndpoint) {
      const body = `${data.message}\n\n— ${data.name} (${data.email})`;
      window.location.href =
        `mailto:${c.email}?subject=${encodeURIComponent(c.emailSubject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(c.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="section" id={c.id}>
      <div className="wrap">
        <p className="section-label">{c.label}</p>
        <h2 className="section-title">{c.heading}</h2>
        <div className="contact-grid">
          <div className="contact-info">
            <p>{c.intro}</p>
            <p className="contact-email">
              <span className="mono-label">Email</span>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </p>
            {c.socials.length > 0 && (
              <ul className="socials">
                {c.socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href}>{s.label}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="form" onSubmit={onSubmit}>
            <label htmlFor="cf-name">{c.form.nameLabel}</label>
            <input id="cf-name" name="name" type="text" autoComplete="name" required />

            <label htmlFor="cf-email">{c.form.emailLabel}</label>
            <input id="cf-email" name="email" type="email" autoComplete="email" required />

            <label htmlFor="cf-message">{c.form.messageLabel}</label>
            <textarea id="cf-message" name="message" rows="5" required />

            <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
              {c.form.submitLabel}
            </button>
            <p className="form-status" role="status">
              {status === "sent" && c.form.successText}
              {status === "error" && c.form.errorText}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
