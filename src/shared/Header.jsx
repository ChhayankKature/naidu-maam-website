import { useState } from "react";
import { BRAND, NAV, PAGES, THEME_KEY } from "../config.js";
import { getTheme, setTheme } from "./theme.js";

// isAdmin adds an "Admin" link, so an admin can move between the user pages and the admin panel.
export default function Header({ email, onLogout, isAdmin }) {
  const [theme, setThemeState] = useState(getTheme);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href={NAV[0].href}>{BRAND}</a>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
          {isAdmin && <a href={PAGES.admin}>Admin</a>}
        </nav>
        {email && (
          <span className="who" title={email}>{email}</span>
        )}
        {email && onLogout && (
          <button type="button" className="theme-toggle" onClick={onLogout}>Sign out</button>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          data-key={THEME_KEY}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}
