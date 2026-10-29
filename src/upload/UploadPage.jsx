import { useCallback, useEffect, useState } from "react";
import { PAGES } from "../config.js";
import { friendlyError } from "../errors.js";
import { getMySubmissionRequests, getMyUploadRequest, hasUploadLeft } from "../api.js";
import { useAuthSession } from "../shared/useAuthSession.js";
import Header from "../shared/Header.jsx";
import Notices from "../shared/Notices.jsx";
import UploadForm from "./UploadForm.jsx";
import RequestPanel from "./RequestPanel.jsx";

export default function UploadPage() {
  const session = useAuthSession();
  const { status, user, userDoc, notice, isAdmin } = session;
  const [reviews, setReviews] = useState(null);       // this person's projects in the review queue
  const [uploadReq, setUploadReq] = useState(undefined); // their "upload another" request (null = never asked)
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [r, q] = await Promise.all([
        getMySubmissionRequests(user.uid),
        getMyUploadRequest(user.uid),
        session.reloadUserDoc()
      ]);
      setReviews(r);
      setUploadReq(q);
      setLoadError("");
    } catch (e) {
      console.error(e);
      setLoadError(friendlyError(e));
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (status === "ready") refresh(); }, [status, refresh]);

  async function onDone() {
    await refresh();
    window.scrollTo({ top: 0 });
  }

  let body;
  if (status === "loading" || status === "seating") {
    body = <p className="hint" aria-live="polite">{status === "seating" ? "Finding you a seat…" : "Checking your session…"}</p>;
  } else if (status === "ready") {
    const left = hasUploadLeft(userDoc);
    const pending = reviews?.find((r) => r.status === "pending");
    const approved = reviews?.find((r) => r.status === "approved");
    const review = userDoc.lastReview;
    const requestsUsed = uploadReq?.status === "pending" ? 1 : 0;

    body = (
      <>
        <dl className="quota">
          <div><dt>Account</dt><dd>{user.email}{isAdmin ? " (admin)" : ""}</dd></div>
          <div><dt>Uploads used</dt><dd>{userDoc.uploadsUsed} of {userDoc.uploadsAllowed}</dd></div>
          <div><dt>Upload requests</dt><dd>{requestsUsed} of 1</dd></div>
        </dl>

        {isAdmin && (
          <div className="notice" role="status">
            <strong>You are using this page as a user</strong>
            You are signed in as an admin, so no college email or seat is needed. Your upload goes through the same review queue as everyone else's,
            and you approve it in the <a href={PAGES.admin}>admin panel</a>. To test more than one upload, grant yourself another in the admin People tab.
          </div>
        )}

        {loadError && <p className="status is-error" role="alert">{loadError}</p>}

        {reviews === null && !loadError ? (
          <p className="hint">Loading your uploads…</p>
        ) : reviews === null ? null : (
          <>
            {pending && (
              <div className="notice" role="status">
                <strong>Waiting for review</strong>
                “{pending.title}” was submitted and is waiting for an admin. It appears in the gallery once approved.
              </div>
            )}
            {!pending && review?.status === "declined" && (
              <div className="notice" role="status">
                <strong>Your project was declined</strong>
                “{review.title}” was declined{review.reason ? `: ${review.reason}` : "."} Your upload is back to {userDoc.uploadsUsed} of {userDoc.uploadsAllowed}, so you can upload again.
              </div>
            )}

            {left ? (
              <UploadForm user={user} onDone={onDone} />
            ) : pending ? (
              <div className="panel">
                <h2 className="section-title">Under review</h2>
                <p className="lede" style={{ marginTop: 12 }}>
                  Your upload is with an admin. If they approve it, it goes into the gallery. If they decline it, your upload comes back and you can try again.
                </p>
                <div className="btn-row" style={{ marginTop: 0 }}>
                  <button type="button" className="btn btn-ghost" onClick={refresh}>Check again</button>
                </div>
              </div>
            ) : (
              <RequestPanel user={user} req={uploadReq} approvedTitle={approved?.title} onChanged={refresh} />
            )}
          </>
        )}
      </>
    );
  } else if (status === "error") {
    body = <p className="status is-error">{friendlyError(session.error)}</p>;
  } else {
    // signed out, or email not verified yet
    body = (
      <div className="panel">
        <Notices notice={notice} />
        <h2 className="section-title">{status === "unverified" ? "Verify your email first" : "Sign in to upload"}</h2>
        <p className="lede" style={{ marginTop: 12 }}>
          {status === "unverified"
            ? "Your email isn't verified yet. Finish verification, then come back here."
            : "Uploading needs an account with a college email. You can browse projects without one."}
        </p>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <a className="btn btn-primary" href={PAGES.auth}>{status === "unverified" ? "Verify email" : "Sign in or create account"}</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header email={status === "ready" ? user.email : null} onLogout={status === "ready" ? session.logout : undefined} isAdmin={isAdmin} />
      <main className="page">
        <div className="wrap upload-wrap">
          <h1 className="page-title">Upload a project</h1>
          {status === "ready" && userDoc && hasUploadLeft(userDoc) && (
            <p className="lede">Add a cover, your team and your work. An admin reviews each project before it appears in the gallery.</p>
          )}
          {body}
        </div>
      </main>
    </>
  );
}
