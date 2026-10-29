import { useState } from "react";
import { REASON_MAX } from "../config.js";
import { sendUploadRequest } from "../api.js";
import { friendlyError } from "../errors.js";
import { reasonProblem } from "../validation.js";

// Rule 3: shown when the upload is used up AND nothing is waiting for review.
// One request at a time: you can't send another while the last is pending;
// once it's accepted or denied the counter is back to 0 of 1 and you can send a new one.
export default function RequestPanel({ user, req, approvedTitle, onChanged }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function send(e) {
    e.preventDefault();
    const p = reasonProblem(reason);
    if (p) return setMsg({ type: "error", text: p });
    setBusy(true); setMsg(null);
    try {
      await sendUploadRequest(user, reason);
      setReason("");
      await onChanged();
      setMsg({ type: "ok", text: "Request sent. An admin will review it." });
    } catch (err) {
      setMsg({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setMsg(null);
    await onChanged();
  }

  const pending = req?.status === "pending";
  let line = "Need to upload another project? Ask an admin for one more upload.";
  if (pending) line = "Your request is waiting for an admin. You can send a new one once it has been accepted or denied.";
  else if (req?.status === "accepted") line = "Your last request was accepted. If the upload form hasn't appeared, press Check again.";
  else if (req?.status === "denied") line = "Your last request was denied. Your requests are back to 0 of 1, so you can send a new one.";

  return (
    <div className="panel">
      {approvedTitle && (
        <div className="notice" role="status"><strong>Approved</strong>“{approvedTitle}” was approved and is now in the project gallery.</div>
      )}
      <h2 className="section-title">You've used your upload</h2>
      <p className="lede" style={{ marginTop: 12 }}>{req === undefined ? "Checking your requests…" : line}</p>

      {req !== undefined && !pending && (
        <form className="form" onSubmit={send} noValidate>
          <div className="field">
            <div className="row-split">
              <label htmlFor="reason">Note for the admin (optional)</label>
              <span className="count">{reason.length}/{REASON_MAX}</span>
            </div>
            <textarea id="reason" value={reason} maxLength={REASON_MAX} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Request another upload"}</button>
          </div>
        </form>
      )}

      <div className="btn-row" style={{ marginTop: pending ? 0 : 16 }}>
        <button type="button" className="btn btn-ghost" onClick={check}>Check again</button>
      </div>
      <p className={`status${msg ? (msg.type === "error" ? " is-error" : " is-ok") : ""}`} role="status" aria-live="polite">{msg?.text}</p>
    </div>
  );
}
