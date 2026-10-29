# Changes

A running log. The newest entry is at the top. Each change to the project is added here.

## 2026-10-30: Everything merged into one site; projects page reads Firestore; admin can use the user pages
- **One project.** Added `auth.html`, `upload.html` and `admin.html` with their code (`src/auth`, `src/upload`, `src/shared`, `src/admin` and the shared files `src/firebase.js`, `config.js`, `api.js`, `session.js`, `validation.js`, `errors.js`). One `src/firebase.js` for all pages. All six pages are build inputs in `vite.config.js`. Landing nav has an **Upload** link.
- **Projects page uses real data.** Removed the dummy projects, the fake type filter and the "number of projects" slider. The globe now shows the documents in `submissions`, grouped by their real category (7, from `src/config.js`), with a count pill and an **Upload** button in the header. Panel shows cover, title, team, format and an Open button. Empty and error states added. Guests can browse; no sign-in.
- **Loading screen is real.** `src/startLoad.js` replaces the sample tasks: it follows the Firestore project list, the first cover images and the landing page. The same screen is shown while `projects.html` loads. `src/sampleData.js` is now preview-only.
- **Admin can use the user pages.** Admin accounts (a document at `admins/{uid}`) can sign in with any email on `auth.html` and use `upload.html` like a user, with no domain check, no verification and no seat. Rules updated (`users` create, `submissionRequests`, `submissionContacts`, `uploadRequests`, storage upload) and `isAdmin()` is checked first. Header shows an Admin link; the admin panel links back to the user pages.
- **Storage delete rule** for admins (needed by the admin panel to remove files) is now in `storage.rules`.
- Admin page fonts are bundled like the other pages instead of loaded from Google Fonts.
- `functions/index.js` (optional) lets admin emails sign in.
- **Redeploy the rules:** `firebase deploy --only firestore:rules,storage`.

## 2026-10-26: Projects page merged into the site
Only changes needed to combine the Aura (projects) project with the loading + landing project. No behavior was changed in either.
- Added `projects.html` and `src/projects/entry.jsx` as the entry for the projects page. Added `projects.html` to the build inputs in `vite.config.js`. The landing nav and hero button already pointed to `projects.html`, so they now work; only a comment in `src/landing/site.config.js` was updated.
- Moved `NeuralProjects.jsx` (the globe version from the Aura zip) to `src/projects/NeuralProjects.jsx`. Its `landPoints.json` import now points to the shared `src/landPoints.json` (`../landPoints.json`), so the loading globe and the projects globe use one data file.
- Added `motion` to `package.json` (the projects page needs it, same version as in Aura). The three.js and fonts dependencies were already here.
- Added a small **Home** link at the top of the projects page so visitors can get back to `landing.html`. Nothing else in the component's code or logic changed.
- Not carried over from Aura: the Vite starter files (`App.jsx`, `App.css`, `index.css`, `main.jsx`, `index.html`, starter images, eslint config, README). They were template leftovers, and `index.css` would have fought the page layout. `index.html` here is still the loading screen.
- Left out of the new site: the `netcore-loading-project-v2.zip` that came inside the Aura zip. It is an older copy of the loading project; v4 is the one used.

## 2026-10-26: Same fonts and look on every page (the one small UI change)
- The projects page now uses the same fonts as the landing page: Michroma for the title and project names, IBM Plex Sans for text, IBM Plex Mono for small uppercase labels (hint line, status labels, buttons). The fonts are bundled through `@fontsource`, loaded in `src/projects/entry.jsx`.
- Page background changed from pure black to `#02060a`, the same color as the loading screen and the landing page, so the page-to-page jump has no color change. The "Open project" button uses the landing page's off-white (`#f1f6f8`) with its dark text.
- Only the `css` string at the bottom of `NeuralProjects.jsx` changed for this. Sizes, positions and layout rules are the same.

## 2026-10-25: Fixed blank landing page on Windows
- `src/landing/landing.jsx` and `src/landing/Landing.jsx` differed only by capital letters, so on Windows one overwrote the other and the page rendered nothing. Renamed the starting file to `src/landing/entry.jsx` and updated `landing.html` to load it.
- Rule from now on: no two files in the project may have names that differ only by case.

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
