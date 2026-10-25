// ─────────────────────────────────────────────────────────────
//  SAMPLE DATA — placeholder only, not real requests.
//
//  These three fake tasks finish after 1.2 s, 2.4 s and 3.6 s so the
//  loading bar has something to follow while the screen is previewed.
//  When the real landing-page data is ready, delete this file and the
//  startSampleLoad() calls in main.jsx, loading.jsx and preview.jsx,
//  then register the real requests with loader.track(...) (see README).
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
