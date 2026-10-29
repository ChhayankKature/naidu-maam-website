import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { deleteObject, listAll, ref } from "firebase/storage";
import { auth, db, storage } from "../firebase.js";
import * as cfg from "../config.js";

const SEATS = cfg.MAX_SEATS ?? 80;
const LEASE = cfg.LEASE_MS ?? 5 * 60 * 1000;
const CAP = 20;
const brand = typeof cfg.BRAND === "string" ? cfg.BRAND : "Dr. Anita Sharma";
const ms = (v) => (v?.toMillis ? v.toMillis() : typeof v === "number" ? v : 0);
const fmt = (v) => (ms(v) ? new Date(ms(v)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");
const splitId = (id) => { const i = id.lastIndexOf("_"); return [id.slice(0, i), id.slice(i + 1)]; };
const live = (s) => Date.now() - ms(s.lastSeen) < LEASE;
// Storage deletes need the admin rule from README.md; returns true if files were left behind.
async function clearFiles(id) {
  const [uid, n] = splitId(id);
  try { const l = await listAll(ref(storage, `submissions/${uid}/${n}`)); await Promise.all(l.items.map(deleteObject)); return false; } catch { return true; }
}
const leftMsg = (id) => { const [u, n] = splitId(id); return `Done, but the files could not be removed. Delete submissions/${u}/${n} in the Storage console.`; };

export default function AdminPage() {
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(null);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u); setIsAdmin(null);
    if (!u) return;
    try { setIsAdmin((await getDoc(doc(db, "admins", u.uid))).exists()); } catch { setIsAdmin(false); }
  }), []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); try { localStorage.setItem("nc-theme", theme); } catch {} }, [theme]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 6000); return () => clearTimeout(t); }, [msg]);

  const load = useCallback(async () => {
    try {
      const names = ["submissions", "submissionRequests", "submissionContacts", "users", "uploadRequests", "blocked", "slots"];
      const get = async (n) => (await getDocs(collection(db, n))).docs.map((x) => ({ id: x.id, ...x.data() }));
      const [subs, queue, contacts, users, ureqs, blocked, slots] = await Promise.all(names.map(get));
      setD({ subs, queue, contacts, users, ureqs, blocked, slots });
    } catch (e) { setMsg("Could not load data: " + (e.code || e.message)); }
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const run = async (fn, ok) => {
    try { const m = await fn(); setMsg(m || ok); await load(); } catch (e) { setMsg("Failed: " + (e.code || e.message)); }
  };

  const chrome = (body) => (
    <>
      <header className="top">
        <span className="brand display">{brand}</span>
        <nav className="nav">
          {/* an admin can use the whole site as a normal user: the upload page accepts admin accounts */}
          <a href={cfg.PAGES.upload}>Use as user</a>
          <a href={cfg.PAGES.projects}>Gallery</a>
          <a href={cfg.PAGES.home}>Site</a>
          {user && <span className="mono" style={{ color: "var(--a-mute)" }}>{user.email}</span>}
          {user && <button className="btn" onClick={() => signOut(auth)}>Sign out</button>}
          <button className="btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light" : "Dark"}</button>
        </nav>
      </header>
      {body}
      {msg && <div className="toast mono" role="status">{msg}</div>}
    </>
  );

  if (user === undefined || (user && isAdmin === null)) return chrome(<main className="gate"><h1 className="display">Checking access</h1></main>);
  if (!user) return chrome(<main className="gate"><h1 className="display">Admin</h1><p className="sub">Sign in with your admin account.</p><Login /></main>);
  if (!isAdmin) return chrome(<main className="gate"><h1 className="display">No access</h1><p className="sub">{user.email} is not an admin. Add a document at admins/{user.uid} in Firestore.</p><p><a className="btn" style={{ textDecoration: "none" }} href={cfg.PAGES.home}>Back to the site</a></p></main>);
  if (!d) return chrome(<main className="gate"><h1 className="display">Loading</h1></main>);

  const pendingReview = d.queue.filter((r) => r.status === "pending").length;
  const pendingReq = d.ureqs.filter((r) => r.status === "pending").length;
  const tabs = [["overview", "Overview"], ["review", "Review", pendingReview], ["requests", "Requests", pendingReq], ["projects", "Projects", d.subs.length], ["people", "People", d.users.length], ["blocked", "Blocked", d.blocked.length]];
  const p = { d, run, adminUid: user.uid };

  return chrome(
    <main>
      <h1 className="display">Admin</h1>
      <p className="sub">Review uploads, answer requests and manage who can submit.</p>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l, n]) => <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}{n !== undefined && <b>{n}</b>}</button>)}
        <button className="tab" style={{ marginLeft: "auto" }} onClick={load}>Refresh</button>
      </div>
      {tab === "overview" && <Overview {...p} go={setTab} pendingReview={pendingReview} pendingReq={pendingReq} />}
      {tab === "review" && <Review {...p} />}
      {tab === "requests" && <Requests {...p} />}
      {tab === "projects" && <Projects {...p} />}
      {tab === "people" && <People {...p} />}
      {tab === "blocked" && <Blocked {...p} />}
    </main>
  );
}

function Overview({ d, go, pendingReview, pendingReq }) {
  const n = d.slots.filter(live).length;
  const cats = useMemo(() => { const c = {}; d.subs.forEach((s) => (c[s.category] = (c[s.category] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1]); }, [d]);
  const max = Math.max(1, ...cats.map((c) => c[1]));
  const marks = Array.from({ length: SEATS }, (_, i) => d.slots.some((s) => s.id === String(i) && live(s)));
  return (
    <>
      <div className="stats">
        <div><span className="lbl">Awaiting review</span><span className="stat display">{pendingReview}</span></div>
        <div><span className="lbl">Upload requests</span><span className="stat display">{pendingReq}</span></div>
        <div><span className="lbl">Approved projects</span><span className="stat display">{d.subs.length}</span></div>
        <div><span className="lbl">Blocked</span><span className="stat display">{d.blocked.length}</span></div>
        <div><span className="lbl">Seats in use</span><span className="stat display">{n} / {SEATS}</span></div>
      </div>
      <div className="two">
        <section>
          <h2 className="display">Seats</h2>
          <div className="seats" aria-label={`${n} of ${SEATS} seats in use`}>{marks.map((on, i) => <i key={i} className={on ? "on" : ""} />)}</div>
        </section>
        <section>
          <h2 className="display">Approved by category</h2>
          {!cats.length && <p className="m">No approved projects yet.</p>}
          {cats.map(([c, k]) => <div className="bar" key={c}><span>{c}</span><span><em style={{ width: `${(k / max) * 100}%` }} /></span><span className="mono">{k}</span></div>)}
          <p style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 32 }}>
            {pendingReview > 0 && <button className="btn" onClick={() => go("review")}>Review {pendingReview}</button>}
            {pendingReq > 0 && <button className="btn" onClick={() => go("requests")}>Answer {pendingReq}</button>}
          </p>
        </section>
      </div>
    </>
  );
}

function Review({ d, run, adminUid }) {
  const [open, setOpen] = useState(""); const [reason, setReason] = useState("");
  const list = d.queue.filter((r) => r.status === "pending").sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  const stillPending = async (id) => { if ((await getDoc(doc(db, "submissionRequests", id))).data()?.status !== "pending") throw new Error("Already handled by someone else"); };

  const approve = (r) => run(async () => {
    await stillPending(r.id);
    const { id, status, ...pub } = r;
    const b = writeBatch(db);
    b.set(doc(db, "submissions", id), { ...pub, approvedAt: serverTimestamp(), approvedBy: adminUid });
    b.update(doc(db, "submissionRequests", id), { status: "approved" });
    b.update(doc(db, "users", r.ownerUid), { lastReview: { status: "approved", title: r.title, at: serverTimestamp() } });
    await b.commit();
  }, "Project approved.");

  const decline = (r) => run(async () => {
    await stillPending(r.id);
    const u = (await getDoc(doc(db, "users", r.ownerUid))).data();
    if (!u || (u.uploadsUsed ?? 0) < 1) throw new Error("Upload count is already 0");
    const b = writeBatch(db);
    b.delete(doc(db, "submissionRequests", r.id));
    b.delete(doc(db, "submissionContacts", r.id));
    b.update(doc(db, "users", r.ownerUid), { uploadsUsed: increment(-1), lastReview: { status: "declined", title: r.title, reason: reason.trim(), at: serverTimestamp() } });
    await b.commit();
    setOpen(""); setReason("");
    return (await clearFiles(r.id)) ? leftMsg(r.id) : "Project declined. The person's upload was returned.";
  }, "");

  if (!list.length) return <p className="empty">Nothing is waiting for review.</p>;
  return list.map((r) => {
    const c = d.contacts.find((x) => x.id === r.id); const link = r.fileUrl || r.linkUrl;
    return (
      <div className="row" key={r.id}>
        {r.coverUrl ? <img src={r.coverUrl} alt="" loading="lazy" /> : <span className="ph" />}
        <div><div className="t">{r.title}</div><div className="m">{r.category} · {(r.teamNames || []).join(", ")} · {fmt(r.createdAt)}</div><div className="m">{c?.ownerEmail}</div></div>
        <div className="acts">
          {link && <a className="btn sm" style={{ textDecoration: "none" }} href={link} target="_blank" rel="noreferrer">Preview</a>}
          <button className="btn sm" onClick={() => approve(r)}>Approve</button>
          <button className="btn sm bad" onClick={() => { setOpen(open === r.id ? "" : r.id); setReason(""); }}>Decline</button>
        </div>
        {(c?.teamMembers || []).length > 0 && <div className="det">{c.teamMembers.map((m, i) => <p key={i}>{m.name} · {m.email}</p>)}</div>}
        {open === r.id && (
          <div className="det">
            <label className="lbl" htmlFor={"rs" + r.id}>Reason shown to the uploader</label>
            <textarea id={"rs" + r.id} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            <div className="acts" style={{ justifyContent: "flex-start" }}><button className="btn sm bad" onClick={() => decline(r)}>Decline and return upload</button><button className="btn sm" onClick={() => setOpen("")}>Cancel</button></div>
          </div>
        )}
      </div>
    );
  });
}

function Requests({ d, run }) {
  const order = { pending: 0, accepted: 1, denied: 2 };
  const list = [...d.ureqs].sort((a, b) => order[a.status] - order[b.status] || ms(b.createdAt) - ms(a.createdAt));
  const accept = (r) => run(async () => {
    if ((await getDoc(doc(db, "uploadRequests", r.id))).data()?.status !== "pending") throw new Error("Already handled");
    const b = writeBatch(db);
    b.update(doc(db, "uploadRequests", r.id), { status: "accepted" });
    b.update(doc(db, "users", r.id), { uploadsAllowed: increment(1) });
    await b.commit();
  }, "Upload granted.");
  const deny = (r) => run(() => updateDoc(doc(db, "uploadRequests", r.id), { status: "denied" }), "Request denied.");
  if (!list.length) return <p className="empty">No upload requests yet.</p>;
  return list.map((r) => (
    <div className="row noimg" key={r.id}>
      <div><div className="t">{r.email}<span className={`tag mono ${r.status}`}>{r.status}</span></div><div className="m">{fmt(r.createdAt)}{r.reason ? ` · "${r.reason}"` : ""}</div></div>
      {r.status === "pending" && <div className="acts"><button className="btn sm" onClick={() => accept(r)}>Grant upload</button><button className="btn sm bad" onClick={() => deny(r)}>Deny</button></div>}
    </div>
  ));
}

function Projects({ d, run }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [open, setOpen] = useState(""); const [del, setDel] = useState(""); const [restore, setRestore] = useState(false);
  const cats = [...new Set(d.subs.map((s) => s.category))];
  const list = d.subs.filter((s) => (!cat || s.category === cat) && `${s.title} ${(s.teamNames || []).join(" ")} ${d.contacts.find((c) => c.id === s.id)?.ownerEmail || ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt));

  const remove = (s) => run(async () => {
    const [uid] = splitId(s.id);
    const b = writeBatch(db);
    b.delete(doc(db, "submissions", s.id));
    b.delete(doc(db, "submissionRequests", s.id));
    b.delete(doc(db, "submissionContacts", s.id));
    const u = d.users.find((x) => x.id === uid);
    if (restore && u) b.update(doc(db, "users", uid), { uploadsAllowed: Math.min(CAP, (u.uploadsAllowed ?? 1) + 1) });
    await b.commit(); setDel("");
    return (await clearFiles(s.id)) ? leftMsg(s.id) : "Project removed.";
  }, "");

  const exportCsv = () => {
    const rows = [["Project", "Category", "Owner email", "Member name", "Member email"]];
    d.subs.forEach((s) => { const c = d.contacts.find((x) => x.id === s.id); (c?.teamMembers || []).forEach((m) => rows.push([s.title, s.category, c.ownerEmail, m.name, m.email])); });
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "project-contacts.csv"; a.click();
  };

  return (
    <>
      <div className="tools">
        <input type="search" placeholder="Search title, team or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn" onClick={exportCsv}>Export contacts</button>
      </div>
      {!list.length && <p className="empty">No approved projects match.</p>}
      {list.map((s) => {
        const c = d.contacts.find((x) => x.id === s.id); const link = s.fileUrl || s.linkUrl;
        return (
          <div className="row" key={s.id}>
            {s.coverUrl ? <img src={s.coverUrl} alt="" loading="lazy" /> : <span className="ph" />}
            <div><div className="t">{s.title}</div><div className="m">{s.category} · {(s.teamNames || []).join(", ")} · {fmt(s.approvedAt || s.createdAt)}</div></div>
            <div className="acts">
              <button className="btn sm" onClick={() => setOpen(open === s.id ? "" : s.id)}>{open === s.id ? "Hide" : "Details"}</button>
              {link && <a className="btn sm" style={{ textDecoration: "none" }} href={link} target="_blank" rel="noreferrer">Open</a>}
              <button className="btn sm bad" onClick={() => setDel(del === s.id ? "" : s.id)}>Remove</button>
            </div>
            {open === s.id && <div className="det"><p><b>Owner:</b> {c?.ownerEmail || "-"}</p>{(c?.teamMembers || []).map((m, i) => <p key={i}>{m.name} · {m.email}</p>)}</div>}
            {del === s.id && (
              <div className="det">
                <p>Remove "{s.title}" from the gallery and delete its files? This cannot be undone.</p>
                <label className="chk"><input type="checkbox" checked={restore} onChange={(e) => setRestore(e.target.checked)} />Also give the uploader one more upload</label>
                <div className="acts" style={{ justifyContent: "flex-start" }}><button className="btn sm bad" onClick={() => remove(s)}>Remove project</button><button className="btn sm" onClick={() => setDel("")}>Cancel</button></div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function People({ d, run, adminUid }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(""); const [reason, setReason] = useState("");
  const blockedIds = new Set(d.blocked.map((b) => b.id));
  const list = d.users.filter((u) => (u.email || "").toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.uploadsUsed ?? 0) - (a.uploadsUsed ?? 0));
  const seatsOf = (uid) => d.slots.filter((s) => s.uid === uid && live(s));
  const setAllowed = (u, n) => run(() => updateDoc(doc(db, "users", u.id), { uploadsAllowed: n }), "Allowance updated.");
  const freeSeat = (u) => run(async () => { await Promise.all(d.slots.filter((s) => s.uid === u.id).map((s) => deleteDoc(doc(db, "slots", s.id)))); }, "Seat freed.");
  const block = (u) => run(async () => {
    const b = writeBatch(db);
    b.set(doc(db, "blocked", u.id), { email: u.email, reason: reason.trim(), blockedAt: serverTimestamp(), blockedBy: adminUid });
    d.slots.filter((s) => s.uid === u.id).forEach((s) => b.delete(doc(db, "slots", s.id)));
    await b.commit(); setOpen(""); setReason("");
  }, "Person blocked and seat freed.");
  const unblock = (u) => run(() => deleteDoc(doc(db, "blocked", u.id)), "Person unblocked.");

  return (
    <>
      <div className="tools"><input type="search" placeholder="Search email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" /></div>
      {!list.length && <p className="empty">No people found.</p>}
      {list.map((u) => {
        const a = u.uploadsAllowed ?? 1, used = u.uploadsUsed ?? 0, isB = blockedIds.has(u.id), seat = seatsOf(u.id).length > 0;
        return (
          <div className="row noimg" key={u.id}>
            <div><div className="t">{u.email}{isB && <span className="tag mono blocked">blocked</span>}{seat && <span className="tag mono">seated</span>}</div><div className="m">Joined {fmt(u.createdAt)} · {used} of {a} uploads used</div></div>
            <div className="acts">
              <button className="btn sm" disabled={a <= used} onClick={() => setAllowed(u, a - 1)} aria-label="Remove one upload">−1</button>
              <button className="btn sm" disabled={a >= CAP} onClick={() => setAllowed(u, a + 1)}>Grant upload</button>
              {seat && <button className="btn sm" onClick={() => freeSeat(u)}>Free seat</button>}
              {isB ? <button className="btn sm" onClick={() => unblock(u)}>Unblock</button> : <button className="btn sm bad" onClick={() => { setOpen(open === u.id ? "" : u.id); setReason(""); }}>Block</button>}
            </div>
            {open === u.id && (
              <div className="det">
                <label className="lbl" htmlFor={"bl" + u.id}>Reason shown to the person</label>
                <textarea id={"bl" + u.id} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
                <div className="acts" style={{ justifyContent: "flex-start" }}><button className="btn sm bad" onClick={() => block(u)}>Block this account</button><button className="btn sm" onClick={() => setOpen("")}>Cancel</button></div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Blocked({ d, run }) {
  const unblock = (b) => run(() => deleteDoc(doc(db, "blocked", b.id)), "Person unblocked.");
  if (!d.blocked.length) return <p className="empty">Nobody is blocked.</p>;
  return d.blocked.sort((a, b) => ms(b.blockedAt) - ms(a.blockedAt)).map((b) => (
    <div className="row noimg" key={b.id}>
      <div><div className="t">{b.email}</div><div className="m">Blocked {fmt(b.blockedAt)}{b.reason ? ` · "${b.reason}"` : ""}</div></div>
      <div className="acts"><button className="btn sm" onClick={() => unblock(b)}>Unblock</button></div>
    </div>
  ));
}

function Login() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await signInWithEmailAndPassword(auth, email.trim(), pw); }
    catch (x) { setErr(x.code === "auth/invalid-api-key" ? "The Firebase API key in .env is missing or wrong." : "Email or password is not correct."); }
    setBusy(false);
  };
  return (
    <form onSubmit={go} style={{ display: "grid", gap: 14 }}>
      <span className="lbl">Email</span>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      <span className="lbl">Password</span>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
      {err && <p className="m" style={{ color: "var(--a-bad)", margin: 0 }}>{err}</p>}
      <div><button className="btn" disabled={busy}>{busy ? "Signing in" : "Sign in"}</button></div>
    </form>
  );
}
