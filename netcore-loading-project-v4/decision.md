# Decisions

Why things are the way they are. Change a decision here when you change it in the code.

## Flow between the two pages
- `index.html` is the loading screen. At 100% it fades to the page background, then opens `landing.html` in the **same tab** (`window.location.replace`). No new tab, and the back button does not return to the loader.
- The target page is `loading.redirect` in `src/netcore.config.js`. Set it to `""` to stay on the loader.
- `landing.html` is downloaded in the background while loading runs (a `prefetch` link added from `src/main.jsx`), so the jump is instant.
- Both pages use the same background color (`#02060a`) and the same display font (Michroma), so the switch looks like one continuous page.

## Landing page structure
- **One webpage, three sections:** Hero, About, Contact. They are reached with in-page anchors (`#about`, `#contact`).
- **Projects is a separate page.** I did not build it. The nav link and the hero's "View projects" button point to `projects.html`. Until that file exists, those links show a not-found page. To change the file name, edit `nav` and `hero.primaryButton` in `src/landing/site.config.js`.
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

## Purpose of the site
- This is a **personal website for a teacher**. Other people (her students) upload projects, and those are displayed on the separate Projects page. It is not a portfolio.
- The upload and display system belongs to the Projects page, which is built later. This landing page only links to it.

## Content
- All names, text, links and subjects are **sample data** (a made-up teacher) (marked `SAMPLE` in `src/landing/site.config.js`). Replace them with real content.
- The loading screen still uses sample data (`src/sampleData.js`) until the real landing-page data is wired in.

## Stack
- Vite, React and three.js, as before. `landing.html` was added as a build entry in `vite.config.js`. No router and no extra UI library.
