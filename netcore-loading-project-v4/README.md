# NetCore Loading Screen

A holographic globe with a "LOADING" word whose letters fill left to right.
It reaches 100% when your real data has loaded, not when a timer ends.

## Run it

1. `npm install`
2. `npm run dev`
3. Open the URL Vite prints. It shows the loading screen, which opens `/landing.html` at 100%.
   `/globe.html` shows the globe alone, `/loading.html` the text alone.

Other docs: `decision.md` (why things are the way they are) and `changes.md` (log of every change).

## Landing page

Everything you can change is in `src/landing/site.config.js` (text, links, nav, sections, contact form) and the `:root` block at the top of `src/landing/landing.css` (colors, fonts, spacing). The Projects page is not built yet; the nav links to `projects.html`.

## Change how it looks

Open `src/netcore.config.js`. Every value has a comment. The ones you will touch first:

- `globe.radius` makes the globe bigger or smaller.
- `globe.topY` moves it up or down.
- `colors.primary`, `colors.secondary`, `colors.accent` recolor the whole hologram.
- `holo.scanlines`, `holo.sweep`, `holo.flicker`, `holo.glitchEvery` set how strong the hologram effect is.
- `text.word` changes the word. `text.fontFamily` changes the font.
- `loading.minDurationMs`, `loading.holdMs`, `loading.fadeMs` set the timing around 100%.

## Connect it to your landing page

1. Copy the `src` folder into your project (it needs `react`, `react-dom` and `three`; `@fontsource/michroma` is used for the font).
2. Render the screen above your page and hide the page until it is ready:
   - Import `LoadingScreen` from `src/App.jsx`.
   - Keep a `ready` state that starts as false.
   - Render `<LoadingScreen onComplete={() => setReady(true)} />` while `ready` is false.
   - Render your landing page when `ready` is true (or render it underneath the whole time).
3. Tell the loader what must finish first. Import `loader` from `src/loader.js` and call it as early as you can, before the first render if possible:
   - `loader.track(fetch("/api/products"), { label: "products", weight: 3 })` waits for a request. Failed requests count as finished.
   - `loader.trackAssets(["/hero.jpg", "/logo.svg", "/data.json"])` preloads images and fetches other files.
   - `weight` is how much of the bar a task is worth (default 1).
   - The page `load` event and web fonts are tracked automatically.
4. If a task is slow or stuck, `loading.timeoutMs` forces 100% after 20 seconds. Set it to 0 to turn this off.

The screen currently loads **sample data** from `src/sampleData.js`: three fake tasks that finish at 1.2 s, 2.4 s and 3.6 s. They are placeholders. When the real data is ready, delete `sampleData.js` and the `startSampleLoad(loader)` lines in `main.jsx`, `loading.jsx` and `preview.jsx`, then add your real `loader.track(...)` calls.
