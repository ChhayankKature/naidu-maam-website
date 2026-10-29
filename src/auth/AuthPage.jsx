import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../firebase.js";
import { PAGES, PASSWORD_MIN } from "../config.js";
import { domainList, emailProblem, emailShapeProblem, normalizeEmail, passwordProblem } from "../validation.js";
import { friendlyError } from "../errors.js";
import { useAuthSession } from "../shared/useAuthSession.js";
import Header from "../shared/Header.jsx";
import SeatGrid from "./SeatGrid.jsx";
import Notices from "../shared/Notices.jsx";

const TITLES = { signin: "Sign in", signup: "Create account", reset: "Reset password" };

export default function AuthPage() {
  const session = useAuthSession();
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "ok", text }
  const [cooldown, setCooldown] = useState(0);  // resend-email cooldown, seconds
  const startedHere = useRef(false);

  // Right after signing in on this page, go to the upload page.
  useEffect(() => {
    if (session.status === "ready" && startedHere.current) window.location.assign(PAGES.upload);
  }, [session.status]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const say = (type, text) => setMessage({ type, text });
  const switchMode = (m) => { setMode(m); setMessage(null); session.clearNotice(); };

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(null);
    session.clearNotice();

    // Sign-up must use a college email. Sign-in and reset only check the shape, because an admin
    // can sign in with any email (whether the account may do anything is decided after sign-in).
    let problem = mode === "signup" ? emailProblem(email) : emailShapeProblem(email);
    if (!problem && mode === "signup") problem = passwordProblem(password);
    if (!problem && mode === "signin" && !password) problem = "Enter your password.";
    if (!problem && mode === "signup" && password !== confirm) problem = "The passwords don't match.";
    if (problem) return say("error", problem);

    setBusy(true);
    try {
      const addr = normalizeEmail(email);
      if (mode === "signin") {
        startedHere.current = true;
        await signInWithEmailAndPassword(auth, addr, password);
      } else if (mode === "signup") {
        startedHere.current = true;
        const cred = await createUserWithEmailAndPassword(auth, addr, password);
        await sendEmailVerification(cred.user);
        setCooldown(30);
      } else {
        await sendPasswordResetEmail(auth, addr);
        say("ok", "If an account exists for that email, a reset link is on its way.");
      }
    } catch (err) {
      startedHere.current = false;
      say("error", friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await sendEmailVerification(auth.currentUser);
      setCooldown(30);
      say("ok", "Verification email sent again.");
    } catch (err) {
      say("error", friendlyError(err));
    }
  }

  async function iVerified() {
    setMessage(null);
    startedHere.current = true;
    try {
      await session.recheckVerification();
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        startedHere.current = false;
        say("error", "This email isn't verified yet. Open the link in the email first.");
      }
    } catch (err) {
      startedHere.current = false;
      say("error", friendlyError(err));
    }
  }

  const { status, notice, user, isAdmin } = session;

  let body;
  if (status === "loading" || status === "seating") {
    body = <p className="hint" aria-live="polite">{status === "seating" ? "Finding you a seat…" : "Checking your session…"}</p>;
  } else if (status === "unverified") {
    body = (
      <div>
        <h2 className="section-title">Verify your email</h2>
        <p className="lede" style={{ marginTop: 12 }}>
          We sent a link to <strong>{user.email}</strong>. Open it, then come back and press the button below.
          Check your spam folder if it doesn't arrive.
        </p>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-primary" onClick={iVerified}>I've verified my email</button>
          <button type="button" className="btn btn-ghost" onClick={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>
        </div>
        <p className="hint" style={{ marginTop: 20 }}>
          Wrong address? <button type="button" className="link-btn" onClick={session.logout}>Sign out and start again</button>
        </p>
      </div>
    );
  } else if (status === "ready") {
    body = (
      <div>
        <h2 className="section-title">You're signed in</h2>
        <p className="lede" style={{ marginTop: 12 }}>{user.email}{isAdmin ? " (admin)" : ""}</p>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <a className="btn btn-primary" href={PAGES.upload}>Go to upload</a>
          {isAdmin && <a className="btn btn-ghost" href={PAGES.admin}>Open admin panel</a>}
          <button type="button" className="btn btn-ghost" onClick={session.logout}>Sign out</button>
        </div>
      </div>
    );
  } else if (status === "error") {
    body = (
      <div>
        <p className="status is-error">{friendlyError(session.error)}</p>
        <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={session.logout}>Sign out</button></div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="tabs" role="tablist" aria-label="Account">
          {["signin", "signup"].map((m) => (
            <button
              key={m} type="button" role="tab" className="tab"
              aria-selected={mode === m || (mode === "reset" && m === "signin")}
              onClick={() => switchMode(m)}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">College email</label>
            <input
              id="email" type="email" autoComplete="email" inputMode="email"
              placeholder="name@rknec.edu" value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="hint">Only {domainList()} addresses can sign up. Admins sign in with their admin account.</p>
          </div>

          {mode !== "reset" && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && <p className="hint">At least {PASSWORD_MIN} characters.</p>}
            </div>
          )}

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </div>

          <p className={`status${message ? (message.type === "error" ? " is-error" : " is-ok") : ""}`} role="status" aria-live="polite">
            {message?.text}
          </p>

          {mode === "signin" && (
            <p className="hint"><button type="button" className="link-btn" onClick={() => switchMode("reset")}>Forgot your password?</button></p>
          )}
          {mode === "reset" && (
            <p className="hint"><button type="button" className="link-btn" onClick={() => switchMode("signin")}>Back to sign in</button></p>
          )}
        </form>
      </>
    );
  }

  return (
    <>
      <Header email={user?.email} onLogout={status === "ready" ? session.logout : undefined} isAdmin={isAdmin} />
      <main className="page">
        <div className="wrap auth-grid">
          <div>
            <h1 className="page-title">{status === "unverified" ? "Almost there" : mode === "signup" ? "Create your account" : "Sign in to upload"}</h1>
            <p className="lede">
              Use your college email to upload a project. You can look through everyone's projects without an account.
            </p>
            <SeatGrid myUid={status === "ready" ? user?.uid : null} />
          </div>

          <div className="panel">
            <Notices notice={notice} />
            {body}
          </div>
        </div>
      </main>
    </>
  );
}
