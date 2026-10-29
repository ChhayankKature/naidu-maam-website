// The real project list for the gallery: everything in the public `submissions` collection.
//
// Only an admin can write to `submissions` (on approval), and anyone, signed in or not, can read it,
// so this works for guests. Emails are never stored there.
//
// The loading screen (index.html) and the projects page both call fetchProjects(). A copy is kept
// in sessionStorage for a couple of minutes, so going loading -> landing -> projects does not
// download the list three times. A newly approved project shows up within CACHE_MS.
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import { CATEGORIES } from "../config.js";

const CACHE_KEY = "nc-projects-v1";
export const CACHE_MS = 2 * 60 * 1000;

const ms = (v) => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);

/** "MyProject" -> "My Project". Titles are letters-only on upload, so words are joined by capitals. */
export const prettyTitle = (t) => String(t || "").replace(/([a-z])([A-Z])/g, "$1 $2");

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

/** One Firestore document -> the plain object the gallery uses (safe to JSON-cache). */
function toProject(id, d) {
  const catIndex = CATEGORIES.findIndex((c) => c.id === d.category);
  return {
    id,
    title: String(d.title || ""),
    name: prettyTitle(d.title),
    category: d.category,
    categoryLabel: categoryLabel(d.category),
    catIndex, // -1 = a category this site doesn't know (still shown under "All")
    teamNames: Array.isArray(d.teamNames) ? d.teamNames : [],
    coverUrl: d.coverUrl || "",
    projectKind: d.projectKind === "link" ? "link" : "file",
    fileUrl: d.fileUrl || "",
    fileExt: d.fileExt || "",
    linkUrl: d.linkUrl || "",
    publishedAt: ms(d.approvedAt) || ms(d.createdAt)
  };
}

function readCache() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (raw && Array.isArray(raw.list) && Date.now() - raw.t < CACHE_MS) return raw.list;
  } catch { /* storage can be blocked or corrupt: just fetch */ }
  return null;
}

function writeCache(list) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), list })); } catch { /* ignore */ }
}

let inflight = null; // two callers at once share one request

/** Newest first. Pass { force: true } to skip the cache (the Retry button does). */
export function fetchProjects({ force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) return Promise.resolve(cached);
  }
  if (!inflight) {
    inflight = getDocs(collection(db, "submissions"))
      .then((snap) => {
        const list = snap.docs
          .map((x) => toProject(x.id, x.data()))
          .sort((a, b) => b.publishedAt - a.publishedAt);
        writeCache(list);
        return list;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Where the "Open project" button goes: the hosted link, or the uploaded file. */
export const projectUrl = (p) => (p.projectKind === "link" ? p.linkUrl : p.fileUrl);

/** Gets the first few cover images into the browser cache so the globe doesn't pop in. */
export const coverUrls = (list, n = 8) => list.map((p) => p.coverUrl).filter(Boolean).slice(0, n);
