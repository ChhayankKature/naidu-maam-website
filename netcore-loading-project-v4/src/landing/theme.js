// Dark / light switching. The first value is set before paint by an inline
// script in landing.html; these helpers read and change it afterwards.
export function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme, storageKey) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(storageKey, theme);
  } catch (e) {
    /* storage can be blocked; the choice just won't be remembered */
  }
}
