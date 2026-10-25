# Changes

A running log. The newest entry is at the top. Each change to the project is added here.

## 2026-10-25: Sample content rewritten for a teacher's site
- The site is a teacher's personal site where others upload projects, not a portfolio. Sample text in `src/landing/site.config.js` now describes a teacher (name, department, subjects, qualifications, office hours). The hero button reads "Browse projects".
- Page title, header brand, footer and contact email set to sample teacher details. Structure, layout, theme and redirect are unchanged.
- Noted the site's purpose in `decision.md`.

## 2026-10-25: Landing page and redirect
- Added `landing.html` and `src/landing/` with Hero, About and Contact on one page.
- Added a dark/light theme switch (dark by default) with the choice remembered in the browser.
- Added nav links to a separate Projects page (`projects.html`, not built yet).
- Added an empty background slot (`src/landing/Background.jsx`) for the animation being made separately.
- Added `src/landing/site.config.js` (all text, links and options, with comments) and `src/landing/landing.css` (colors, fonts, spacing tokens).
- Contact form opens the visitor's email app; set `contact.formEndpoint` to send to a real service instead.
- Loading screen now opens `landing.html` in the same tab at 100% (`loading.redirect` in `src/netcore.config.js`) and downloads the landing page in the background while loading.
- Added `landing.html` to the build in `vite.config.js`. Installed `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`.
- Added `decision.md` and this file.

## 2026-10-23: Loading text back to white, more letter spacing
- Loading word is white again: white outline, white fill and white glow. The cyan/violet text colors were removed.
- Letter spacing raised from 0.04 em to 0.14 em, and the text size reduced slightly so it fits. New settings in `text`: `outline`, `fill`, `fillEnd`, `glow`, `letterSpacing`.

## 2026-10-23: White holographic globe, lowered
- Globe is white with a soft glow. It has its own colors in `globe.colors`, so the text colors are separate.
- Globe moved lower: `globe.topY` 0.62 → 0.74.

## 2026-10-23: Sample data marked
- Moved the fake loading tasks into `src/sampleData.js` with comments saying they are placeholders. Added a note to the README on removing them.

## 2026-10-23: Hologram look, config file and real progress
- Globe made smaller (`globe.radius` 2.0 → 1.3) and holographic: scanlines, sweep band, flicker, glitch, grid lines, colored fringe.
- All settings moved to `src/netcore.config.js`.
- Loading progress now follows real work through `src/loader.js` (`loader.track`, `loader.trackAssets`). Page load and fonts are tracked automatically. Added `src/useLoaderProgress.js`.
- Replaced the caption lines; the screen shows only the word and the percentage.

## 2026-10-23: Globe rebuilt in 3D
- Replaced the flat SVG globe with a rotating three.js globe: dotted continents from world map data, city nodes, arcs and travelling pulses.
- Loading word set in Michroma; letters fill left to right with progress.

## 2026-10-23: First version
- Original project preview checked: globe and loading text with a simulated 0–100% timer.
