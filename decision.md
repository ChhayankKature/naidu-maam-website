# Decisions

Why things are the way they are. Change a decision here when you change it in the code.

## Merged site: data, admin and loading (2026-10-30)
- **One Firebase project and one `src/firebase.js`** for every page. Admin and user pages no longer have separate configs.
- **The gallery reads `submissions` only.** That collection is public-read and admin-write, holds no emails, and only ever contains approved projects, so guests can browse with no sign-in and the page needs no auth code.
- **Categories come from `src/config.js`** (the same list the upload form uses), so a new category is added in one place. The globe gives each category its own region (points spread evenly over the sphere), so it works for any number of categories.
- **Admin on the user pages = the normal flow, minus three checks** (college domain, email verification, seat). Uploads still go to the review queue and an admin approves them. This keeps one code path and lets an admin test the whole flow. Rules check `isAdmin()` before anything that needs a seat.
- **Loading follows real work, not a timer.** Failed requests count as finished so the screen can't hang. The projects list is cached in `sessionStorage` for 2 minutes so three page loads make one request.
- **The globe caps at the newest 120 projects** to stay smooth on phones.
- **Not enforced:** an admin approving their own project. It is allowed on purpose (it is how an admin tests the flow). Add a check in `src/admin/AdminPage.jsx` and the rules if you want a second admin required.

## Flow between the pages
- The site is `index.html` (loading) → `landing.html` (landing) → `projects.html` (gallery), plus `auth.html`, `upload.html` and `admin.html` (see "Merged site" above). The landing page links to projects; the projects page links back with **Home**. See "Projects page" below.
- `index.html` is the loading screen. At 100% it fades to the page background, then opens `landing.html` in the **same tab** (`window.location.replace`). No new tab, and the back button does not return to the loader.
- The target page is `loading.redirect` in `src/netcore.config.js`. Set it to `""` to stay on the loader.
- `landing.html` is downloaded in the background while loading runs (a `prefetch` link added from `src/main.jsx`), so the jump is instant.
- Both pages use the same background color (`#02060a`) and the same display font (Michroma), so the switch looks like one continuous page.

## Landing page structure
- **One webpage, three sections:** Hero, About, Contact. They are reached with in-page anchors (`#about`, `#contact`).
- **Projects is a separate page** (`projects.html`, see below). The nav link and the hero's "Browse projects" button point to it. To change the file name, edit `nav` and `hero.primaryButton` in `src/landing/site.config.js`.
- Sections are plain React components in `src/landing/`. Removing a section: set `about.show` or `contact.show` to `false`.

## Look
- **White and black, two modes.** Dark is the default because the loading screen is dark and the pages need to join up. A header button switches to light. The visitor's choice is remembered in the browser.
- The theme is set by a tiny script in `landing.html` before the page paints, so the wrong color never flashes. Its `DEFAULT_THEME` must match `theme.default` in `site.config.js`.
- **Monochrome, no accent color.** The only "color" is white on black or black on white, to match the white holographic globe. Buttons invert (white on dark, black on light).
- **Fonts:** Michroma for headings (same as the loading word), IBM Plex Sans for reading text, IBM Plex Mono for small uppercase labels. Fonts are bundled through `@fontsource`, so the page works offline and never waits on Google Fonts.
- Layout is left aligned with thin hairline rules between sections and a 1080 px content width. On phones the two-column areas stack into one column.

## Background animation
- Someone else is making it, so the page has an empty **background slot** (`src/landing/Background.jsx`, a fixed layer behind everything). Render the animation there when it is ready. Page content sits above it.
- No other animations were added: no scroll effects, no hover motion, no smooth scrolling. The loading screen keeps its existing animations.

## Contact form
- With no server yet, **Send message opens the visitor's email app** with the message filled in (`mailto:`). It needs nothing to run.
- To send messages for real, put a Formspree/Getform/own API URL in `contact.formEndpoint`. The form then POSTs JSON and shows a success or error line under the button.

## Projects page (merged 2026-10-26)
- **Merged as a third page, not into the landing page.** The landing page was already designed to link to a separate `projects.html`, and the projects page is a full-screen interactive globe that takes over the whole window. A separate page keeps both working exactly as built. There is still no router, same as before.
- **One decision about the code:** the projects component was copied as it came from the Aura zip. Only three things changed: its data import path, a **Home** link, and its styles (below). No logic, data or behavior changed.
- **One shared world map.** The projects globe reads `src/landPoints.json`, the same file as the loading globe, so the two globes show the same continents. The Aura copy of the file was identical in purpose and is not duplicated.
- **Projects page is dark only.** The globe is white dots on a dark background, so it does not follow the light mode of the landing page. The landing page keeps its Dark/Light switch. The projects page does not have one, and its page background matches the dark theme (`#02060a`), so the jump from the landing page is clean in dark mode. Making a light version of the globe would be a separate piece of work.
- **Same fonts and labels everywhere.** Michroma for titles, IBM Plex Sans for reading text, IBM Plex Mono uppercase for small labels, as on the landing page. Round buttons and the pill-shaped count slider on the projects page are kept as they were, because they are part of how the page works.
- **Still sample content.** The project names, leads and numbers on the projects page are dummy data (`PROJECTS` in `NeuralProjects.jsx`). The "Open project" button has no destination yet, as before. The student upload system is still to be built.
- **Aura starter files were dropped.** `App.jsx`, `index.css` and the other Vite template files were not used by the projects page and some of them (a centered 1126 px `#root`) would have broken the layout.

## Purpose of the site
- This is a **personal website for a teacher**. Other people (her students) upload projects, and those are displayed on the separate Projects page. It is not a portfolio.
- The upload and display system belongs to the Projects page. The page itself is in place with sample data; the real upload system is still to be built.

## Content
- All names, text, links and subjects are **sample data** (a made-up teacher) (marked `SAMPLE` in `src/landing/site.config.js`). Replace them with real content.
- The loading screen still uses sample data (`src/sampleData.js`) until the real landing-page data is wired in.

## Stack
- Vite, React and three.js, as before. `landing.html` and `projects.html` are build entries in `vite.config.js`. The projects page also uses `motion` (animation library). No router and no extra UI library.
