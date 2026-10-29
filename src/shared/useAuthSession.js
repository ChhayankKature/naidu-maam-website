// One hook for the auth and upload pages. It answers: who is signed in, are they allowed,
// and do they hold one of the 80 seats?
//
// status:
//   loading     waiting for Firebase
//   signedOut   nobody signed in
//   unverified  signed in, but the email isn't verified yet
//   seating     verified, getting a seat
//   ready       verified and seated: can upload
//   error       something failed (see `error`)
// notice: why someone was just signed out ("full" | "lost" | "domain" | "blocked")
// isAdmin: true when the person has an admins/{uid} document. Admins use the pages as normal
//   users, but any email is accepted, verification is skipped and no seat is taken.
import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase.js";
import { emailProblem } from "../validation.js";
import { claimSeat, startHeartbeat } from "../session.js";
import { ensureUserDoc, getBlock, getUserDoc, isAdminUser } from "../api.js";

const BLANK = { status: "loading", user: null, userDoc: null, isAdmin: false, error: null };

export function useAuthSession() {
  const [state, setState] = useState(BLANK);
  const [notice, setNotice] = useState(null);
  const beat = useRef(null);
  const run = useRef(0);

  const stopBeat = () => { beat.current?.stop(); beat.current = null; };

  const evaluate = useCallback(async (user) => {
    const id = ++run.current;
    stopBeat();

    if (!user) { setState({ ...BLANK, status: "signedOut" }); return; }

    // Admin first: an admin may sign in with any email.
    setState({ ...BLANK, status: "loading", user });
    const admin = await isAdminUser(user.uid);
    if (id !== run.current) return;

    if (admin) {
      // Admin: no domain rule, no email verification, no seat. Everything else is the normal user flow.
      try {
        const userDoc = await ensureUserDoc(user);
        if (id !== run.current) return;
        setState({ status: "ready", user, userDoc, isAdmin: true, error: null });
      } catch (error) {
        console.error(error);
        if (id === run.current) setState({ status: "error", user, userDoc: null, isAdmin: true, error });
      }
      return;
    }

    // Rule 1, second line of defence: accounts made outside this page can't get in either.
    if (emailProblem(user.email || "")) {
      setNotice({ type: "domain", email: user.email });
      await signOut(auth);
      return;
    }
    if (!user.emailVerified) { setState({ status: "unverified", user, userDoc: null, isAdmin: false, error: null }); return; }

    setState({ status: "seating", user, userDoc: null, isAdmin: false, error: null });
    try {
      // Blocked by an admin? Say so instead of failing quietly further down.
      const block = await getBlock(user.uid);
      if (id !== run.current) return;
      if (block) { setNotice({ type: "blocked", reason: block.reason || "" }); await signOut(auth); return; }

      const seat = await claimSeat(user.uid);
      if (id !== run.current) return;
      if (seat === null) { setNotice({ type: "full" }); await signOut(auth); return; }

      const userDoc = await ensureUserDoc(user);
      if (id !== run.current) return;

      beat.current = startHeartbeat({
        uid: user.uid,
        seat,
        onLost: async (why, block) => {
          setNotice(why === "blocked" ? { type: "blocked", reason: block?.reason || "" } : { type: "lost" });
          await signOut(auth);
        }
      });
      setState({ status: "ready", user, userDoc, isAdmin: false, error: null });
    } catch (error) {
      console.error(error);
      if (id === run.current) setState({ status: "error", user, userDoc: null, isAdmin: false, error });
    }
  }, []);

  useEffect(() => {
    const off = onAuthStateChanged(auth, evaluate);
    return () => { off(); stopBeat(); };
  }, [evaluate]);

  /** After the person clicks the link in the verification email. */
  const recheckVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    // The security rules read "email verified" from the login token, which still says
    // "not verified" until it's refreshed. Without this the rules reject them for up to an hour.
    if (auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true);
    await evaluate(auth.currentUser);
  }, [evaluate]);

  const reloadUserDoc = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    const userDoc = await getUserDoc(uid);
    setState((s) => ({ ...s, userDoc }));
    return userDoc;
  }, []);

  const logout = useCallback(async () => {
    const b = beat.current;
    beat.current = null;
    if (b) await b.release(); // frees the seat straight away (admins hold none)
    await signOut(auth);
  }, []);

  return { ...state, notice, clearNotice: () => setNotice(null), recheckVerification, reloadUserDoc, logout };
}
