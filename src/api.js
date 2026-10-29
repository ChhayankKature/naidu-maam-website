// Everything that reads or writes the database and file storage.
import {
  collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, writeBatch, serverTimestamp, increment
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase.js";
import { MIME } from "./config.js";
import { getExt, normalizeEmail, getCategory } from "./validation.js";

/**
 * users/{uid} holds the upload allowance:
 *   uploadsAllowed  starts at 1; only an admin can raise it (rule 2 / 3)
 *   uploadsUsed     goes up by 1 with each upload; people can't change it any other way.
 *                   An admin lowers it by 1 when a project is declined (back to 0/1).
 *   lastReview      written by the admin panel: { status: "approved" | "declined", title, reason?, at }
 */
export async function ensureUserDoc(user) {
  const r = doc(db, "users", user.uid);
  const snap = await getDoc(r);
  if (snap.exists()) return snap.data();
  await setDoc(r, {
    email: normalizeEmail(user.email),
    uploadsAllowed: 1,
    uploadsUsed: 0,
    createdAt: serverTimestamp()
  });
  return (await getDoc(r)).data();
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export const hasUploadLeft = (u) => !!u && u.uploadsUsed < u.uploadsAllowed;

/**
 * Is this person an admin? (a document at admins/{uid}, created by hand in the Firebase console)
 * Admins can use the upload pages like any user, but they are not limited to college emails,
 * need no verified email and never take one of the 80 seats.
 */
export async function isAdminUser(uid) {
  try {
    return (await getDoc(doc(db, "admins", uid))).exists();
  } catch {
    return false; // the rules refuse the read for anyone else's uid
  }
}

/** Has an admin blocked this person? Returns the blocked/{uid} data, or null. */
export async function getBlock(uid) {
  const snap = await getDoc(doc(db, "blocked", uid));
  return snap.exists() ? snap.data() : null;
}

/** The person's projects in the review queue (newest first): status is "pending" or "approved". */
export async function getMySubmissionRequests(uid) {
  const snap = await getDocs(query(collection(db, "submissionRequests"), where("ownerUid", "==", uid)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? Infinity) - (a.createdAt?.toMillis?.() ?? Infinity));
}

/** Rule 3: uploadRequests/{uid} is the person's latest "upload another" request. */
export async function getMyUploadRequest(uid) {
  const snap = await getDoc(doc(db, "uploadRequests", uid));
  return snap.exists() ? snap.data() : null;
}

export async function sendUploadRequest(user, reason) {
  const r = doc(db, "uploadRequests", user.uid);
  const existing = await getDoc(r);
  const note = String(reason || "").trim();
  if (existing.exists()) {
    // only allowed by the rules when the last one was accepted or denied
    await updateDoc(r, { status: "pending", reason: note, createdAt: serverTimestamp() });
  } else {
    await setDoc(r, {
      uid: user.uid,
      email: normalizeEmail(user.email),
      status: "pending",
      reason: note,
      createdAt: serverTimestamp()
    });
  }
}

function uploadFile(path, file, contentType, onBytes) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file, { contentType });
    task.on(
      "state_changed",
      (s) => onBytes(s.bytesTransferred),
      reject,
      async () => resolve({ url: await getDownloadURL(task.snapshot.ref), path })
    );
  });
}

/**
 * form = { title, category, members:[{name,email}], cover:File,
 *          projectKind:"file"|"link", file?:File, link?:string }
 * Uploads the files first, then writes three documents in ONE batch:
 *   submissionRequests/{uid}_{n}  the review queue: status "pending", waits for an admin
 *   submissionContacts/{uid}_{n}  private: uploader + team emails (owner and admin only)
 *   users/{uid}                   uploadsUsed + 1
 * Nothing reaches the public `submissions` collection until an admin approves it.
 * If any of them is refused, none are written.
 */
export async function submitProject({ user, form, onProgress }) {
  const uid = user.uid;
  const fresh = await getUserDoc(uid);
  if (!hasUploadLeft(fresh)) {
    const e = new Error("You have no uploads left."); e.code = "no-upload-left"; throw e;
  }
  const n = fresh.uploadsUsed + 1;
  const id = `${uid}_${n}`;
  const base = `submissions/${uid}/${n}`;

  const jobs = [{ path: `${base}/cover.webp`, file: form.cover, type: MIME.webp }];
  let fileExt = null;
  if (form.projectKind === "file") {
    fileExt = getExt(form.file.name);
    jobs.push({ path: `${base}/project.${fileExt}`, file: form.file, type: MIME[fileExt] });
  }

  const total = jobs.reduce((s, j) => s + j.file.size, 0);
  const sent = jobs.map(() => 0);
  const report = () => onProgress?.(Math.round((sent.reduce((a, b) => a + b, 0) / total) * 100));
  const results = await Promise.all(
    jobs.map((j, i) => uploadFile(j.path, j.file, j.type, (b) => { sent[i] = b; report(); }))
  );

  const cat = getCategory(form.category);
  const members = form.members.map((m) => ({ name: m.name.trim(), email: normalizeEmail(m.email) }));

  const pub = {
    ownerUid: uid,
    title: form.title,
    category: cat.id,
    teamNames: members.map((m) => m.name),
    coverPath: results[0].path,
    coverUrl: results[0].url,
    projectKind: form.projectKind,
    status: "pending",
    createdAt: serverTimestamp()
  };
  if (form.projectKind === "file") {
    Object.assign(pub, {
      filePath: results[1].path,
      fileUrl: results[1].url,
      fileExt,
      originalName: form.file.name.slice(0, 120)
    });
  } else {
    pub.linkUrl = form.link.trim();
  }

  const batch = writeBatch(db);
  batch.set(doc(db, "submissionRequests", id), pub);
  batch.set(doc(db, "submissionContacts", id), {
    ownerUid: uid,
    ownerEmail: normalizeEmail(user.email),
    teamMembers: members,
    createdAt: serverTimestamp()
  });
  batch.update(doc(db, "users", uid), { uploadsUsed: increment(1) });
  await batch.commit();

  return { id, title: form.title };
}
