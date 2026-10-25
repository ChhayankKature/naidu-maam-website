// Real-progress tracker.
//
//   import loader from "./loader";
//   loader.track(fetch("/api/products"), { label: "products", weight: 3 });
//   loader.trackAssets(["/hero.jpg", "/data.json"]);
//
// The loading screen reaches 100% when every tracked task has finished
// (success or failure). Page load and web fonts are tracked automatically.

export function createLoader({ builtins = true } = {}) {
  let tasks = [];
  let forced = false;
  let lastAdded = performance.now();
  const listeners = new Set();
  const emit = () => listeners.forEach((l) => l());

  function track(input, { weight = 1, label = "" } = {}) {
    const task = { label, weight, done: false };
    tasks.push(task);
    lastAdded = performance.now();
    const finish = () => {
      if (!task.done) {
        task.done = true;
        emit();
      }
    };
    let p;
    try {
      p = Promise.resolve(typeof input === "function" ? input() : input);
    } catch (e) {
      p = Promise.reject(e);
    }
    p.then(finish, finish);
    emit();
    return task;
  }

  function trackAssets(urls, { weight = 1 } = {}) {
    urls.forEach((url) => {
      const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url);
      track(
        isImage
          ? new Promise((resolve) => {
              const img = new Image();
              img.onload = img.onerror = resolve;
              img.src = url;
            })
          : fetch(url),
        { weight, label: url }
      );
    });
  }

  function addBuiltins() {
    track(
      new Promise((resolve) => {
        if (document.readyState === "complete") resolve();
        else window.addEventListener("load", resolve, { once: true });
      }),
      { label: "page" }
    );
    if (document.fonts?.ready) track(document.fonts.ready, { label: "fonts" });
  }

  const api = {
    track,
    trackAssets,
    // 0–100, the share of task weight that has finished
    getProgress() {
      if (forced) return 100;
      const total = tasks.reduce((s, t) => s + t.weight, 0);
      if (!total) return 0;
      const done = tasks.reduce((s, t) => s + (t.done ? t.weight : 0), 0);
      return (done / total) * 100;
    },
    get lastAdded() {
      return lastAdded;
    },
    // jump straight to 100%
    complete() {
      forced = true;
      emit();
    },
    // start over (used by the Replay button, or before a new page load)
    reset() {
      tasks = [];
      forced = false;
      if (builtins) addBuiltins();
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };

  if (builtins) addBuiltins();
  return api;
}

const loader = createLoader();
export default loader;
