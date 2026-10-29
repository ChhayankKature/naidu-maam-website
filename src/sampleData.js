// ─────────────────────────────────────────────────────────────
//  PREVIEW ONLY. Not used by the real site any more.
//
//  The real loading screen follows real work: see src/startLoad.js (Firestore projects, cover
//  images, the landing page). These three fake tasks (1.2 s, 2.4 s, 3.6 s) are only kept for the
//  standalone previews (preview.jsx, preview2.jsx, vite.single.config.js) that run without a
//  Firebase connection. Delete this file together with those previews if you don't need them.
// ─────────────────────────────────────────────────────────────
const SAMPLE_TASKS = [
  { label: "sample: hero content", delayMs: 1200, weight: 2 }, // SAMPLE
  { label: "sample: product list", delayMs: 2400, weight: 2 }, // SAMPLE
  { label: "sample: user profile", delayMs: 3600, weight: 2 }  // SAMPLE
];

export function startSampleLoad(loader) {
  SAMPLE_TASKS.forEach(({ label, delayMs, weight }) =>
    loader.track(new Promise((resolve) => setTimeout(resolve, delayMs)), { label, weight })
  );
}
