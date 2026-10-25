import { useState } from "react";
import site from "./site.config.js";
import { getTheme, setTheme } from "./theme.js";

export default function Header() {
  const [theme, setThemeState] = useState(getTheme);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next, site.theme.storageKey);
    setThemeState(next);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="#hero">{site.brand}</a>
        <nav className="nav" aria-label="Main">
          {site.nav.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
        </nav>
        {site.theme.allowToggle && (
          <button
            id="theme-toggle"
            className="theme-toggle"
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        )}
      </div>
    </header>
  );
}
