// Rule 4: only 80 people signed in at once.
//
// Firebase can't count "people online", so this uses 80 numbered seats:
//   slots/0 … slots/79   one document per seat: { uid, lastSeen }
//   sessions/{uid}       which seat a person holds: { slot, lastSeen }
// A signed-in page claims a free seat and "checks in" every 2 minutes.
// A seat with no check-in for 5 minutes is free again, so closed tabs and
// dead connections clear themselves. firestore.rules enforces all of this
// (seat numbers 0–79 only, no taking a live seat, uploads need a live seat).
import {
  collection, doc, getDoc, getDocs, serverTimestamp, updateDoc, writeBatch, deleteDoc
} from "firebase/firestore";
import { db } from "./firebase.js";
import { getBlock } from "./api.js";
import { HEARTBEAT_MS, LEASE_MS, MAX_SEATS } from "./config.js";

const slotRef = (n) => doc(db, "slots", String(n));
const sessionRef = (uid) => doc(db, "sessions", uid);

/** Who holds which seat right now. Works for guests too (seats are public, no emails). */
export async function readSeats() {
  const snap = await getDocs(collection(db, "slots"));
  const now = Date.now();
  const live = new Map(); // seat number -> uid
  snap.forEach((d) => {
    const ms = d.data().lastSeen?.toMillis?.(); // missing = just written by this browser
    if (ms === undefined || ms + LEASE_MS > now) live.set(Number(d.id), d.data().uid);
  });
  return { live, used: live.size, total: MAX_SEATS };
}

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let inflight = null; // two claims at once (React dev mode, two tabs loading) would take two seats

/** Returns the seat number, or null when all seats are taken. */
export function claimSeat(uid) {
  if (!inflight) inflight = doClaim(uid).finally(() => { inflight = null; });
  return inflight;
}

async function doClaim(uid) {
  const { live } = await readSeats();
  const mine = [...live.entries()].find(([, u]) => u === uid)?.[0];

  const order = [];
  if (mine !== undefined) order.push(mine); // already seated (another tab or page): reuse it
  const free = [];
  for (let i = 0; i < MAX_SEATS; i++) if (!live.has(i)) free.push(i);
  if (mine === undefined && free.length === 0) return null; // full
  order.push(...shuffle(free));

  let tries = 0;
  for (const n of order) {
    if (tries++ >= 8) break;
    try {
      const batch = writeBatch(db);
      batch.set(sessionRef(uid), { slot: String(n), lastSeen: serverTimestamp() });
      batch.set(slotRef(n), { uid, lastSeen: serverTimestamp() });
      await batch.commit();
      return n;
    } catch (e) {
      // someone else got that seat a moment ago: try the next one
      if (e.code === "permission-denied" || e.code === "failed-precondition") continue;
      throw e;
    }
  }
  const err = new Error("Could not get a seat. Check that firestore.rules is deployed.");
  err.code = "seat-denied";
  throw err;
}

/** Keeps the seat alive. Returns { stop, release }. */
export function startHeartbeat({ uid, seat, onLost }) {
  let slot = seat;
  let stopped = false;

  const beat = async () => {
    if (stopped) return;
    try {
      await updateDoc(slotRef(slot), { lastSeen: serverTimestamp() });
    } catch (e) {
      // Seat was taken after a long sleep, or deleted: get a new one.
      if (e.code === "permission-denied" || e.code === "not-found") {
        try {
          // An admin may have blocked this person while they were signed in.
          const block = await getBlock(uid);
          if (block) { stop(); onLost("blocked", block); return; }
          const n = await claimSeat(uid);
          if (n === null) { stop(); onLost("lost"); } else slot = n;
        } catch { /* try again at the next check-in */ }
      }
      // network trouble: just try again at the next check-in
    }
  };

  const timer = setInterval(beat, HEARTBEAT_MS);
  const onVisible = () => { if (document.visibilityState === "visible") beat(); }; // laptop woke up
  document.addEventListener("visibilitychange", onVisible);

  function stop() {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  }

  async function release() {
    stop();
    try { await deleteDoc(slotRef(slot)); } catch { /* the seat frees itself after 5 minutes anyway */ }
  }

  return { stop, release };
}
