// The REAL work the loading screen waits for. It replaces the old sample tasks (sampleData.js).
//
// Progress reaches 100% when the published projects have come back from Firestore and the first
// few cover images are in the browser cache. A request that fails still counts as finished, so a
// slow or offline connection never leaves the screen stuck (loading.timeoutMs is the last safety net).
// Page load and fonts are tracked automatically by loader.js.
import { fetchProjects, coverUrls } from "./data/projects.js";

export function startRealLoad(loader, { withCovers = true } = {}) {
  return loader.track(
    fetchProjects().then((list) => {
      // Added before this task is marked done, so the bar can't hit 100% in between.
      if (withCovers) loader.trackAssets(coverUrls(list), { weight: 1 });
      return list;
    }),
    { label: "projects", weight: 4 }
  );
}
