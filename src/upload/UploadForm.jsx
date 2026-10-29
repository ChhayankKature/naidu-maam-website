import { useEffect, useRef, useState } from "react";
import { CATEGORIES, MAX_FILE_BYTES, MAX_TEAM, NAME_MAX, TITLE_MAX } from "../config.js";
import {
  coverProblem, getCategory, looksLikeWebp, projectProblem, teamProblems, titleProblem
} from "../validation.js";
import { submitProject } from "../api.js";
import { friendlyError } from "../errors.js";

let nextId = 1;
const newMember = (email = "") => ({ id: nextId++, name: "", email });
const limitMb = MAX_FILE_BYTES / (1024 * 1024);

export default function UploadForm({ user, onDone }) {
  const [cover, setCover] = useState(null);
  const [coverError, setCoverError] = useState("");
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState(() => [newMember(user.email)]); // uploader's email is already filled in
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("link"); // only used by "Projects": link or file
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!cover) { setPreview(""); return; }
    const url = URL.createObjectURL(cover);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  const cat = getCategory(category);
  const kind = cat ? (cat.kind === "either" ? mode : cat.kind) : null;

  const errors = {
    cover: coverError || (cover ? "" : "Choose a cover image."),
    title: titleProblem(title),
    team: teamProblems(members),
    category: cat ? "" : "Choose a category.",
    project: cat ? projectProblem({ category, mode, file, link }) : ""
  };
  const hasErrors = !!(errors.cover || errors.title || errors.team.any || errors.category || errors.project);

  async function onCover(e) {
    const f = e.target.files?.[0] || null;
    e.target.value = ""; // so choosing the same file again still fires
    setCover(null);
    if (!f) { setCoverError(""); return; }
    let problem = coverProblem(f);
    if (!problem && !(await looksLikeWebp(f))) problem = "This file isn't a real WebP image.";
    setCoverError(problem);
    if (!problem) setCover(f);
  }

  function pickCategory(id) {
    setCategory(id);
    setFile(null);
    setLink("");
    setMode("link");
    setConfirming(false);
  }

  const updateMember = (id, patch) => setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  function focusFirstError() {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector('[aria-invalid="true"], .field.invalid');
      el?.scrollIntoView({ block: "center" });
      el?.focus?.();
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setStatus(null);
    if (hasErrors) { setConfirming(false); focusFirstError(); return; }
    setConfirming(true);
  }

  async function doUpload() {
    setConfirming(false);
    setBusy(true);
    setProgress(0);
    setStatus(null);
    try {
      const result = await submitProject({
        user,
        onProgress: setProgress,
        form: { title, category, members, cover, projectKind: kind, file, link }
      });
      onDone(result);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  const show = submitted;
  const exts = cat?.exts || [];
  const titleErr = title ? errors.title : show ? errors.title : "";

  return (
    <form className="form" onSubmit={onSubmit} ref={formRef} noValidate>
      <fieldset disabled={busy}>
        {/* 1. who */}
        <div className="field">
          <label htmlFor="up-email">Uploading as</label>
          <input id="up-email" type="email" value={user.email} readOnly aria-describedby="up-email-hint" />
          <p id="up-email-hint" className="hint">This is your account email. Each email gets one upload, and an admin reviews it.</p>
        </div>

        {/* 2. cover */}
        <div className={`field section${show && errors.cover ? " invalid" : ""}`} tabIndex={-1}>
          <div className="section-head"><h2 className="section-title">Cover image</h2></div>
          <p className="hint">WebP only (.webp), up to {limitMb} MB.</p>
          <div className="file-box">
            <input id="cover" type="file" accept="image/webp,.webp" onChange={onCover} aria-describedby="cover-err" />
            <label htmlFor="cover" className="btn btn-ghost">{cover ? "Change image" : "Choose image"}</label>
            <span className={`file-name${cover ? "" : " empty"}`}>{cover ? cover.name : "No image chosen"}</span>
            {preview && <img className="cover-preview" src={preview} alt="Cover preview" />}
          </div>
          <p id="cover-err" className="error" role={show || coverError ? "alert" : undefined}>
            {coverError || (show ? errors.cover : "")}
          </p>
        </div>

        {/* 3. title */}
        <div className="field section">
          <div className="section-head"><h2 className="section-title">Project title</h2></div>
          <div className="row-split">
            <label htmlFor="title" style={{ margin: 0 }}>Letters A–Z only, no spaces</label>
            <span className="count">{title.length}/{TITLE_MAX}</span>
          </div>
          <input
            id="title" type="text" value={title} maxLength={TITLE_MAX} autoComplete="off" spellCheck={false}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={titleErr ? "true" : undefined} aria-describedby="title-err"
          />
          <p id="title-err" className="error">{titleErr}</p>
        </div>

        {/* 4. team */}
        <div className="field section">
          <div className="section-head">
            <h2 className="section-title">Team members</h2>
            <span className="count">{members.length} of {MAX_TEAM}</span>
          </div>
          <p className="hint">Up to {MAX_TEAM}. Add yourself too. Names are shown with the project; emails stay private.</p>
          <ul className="team">
            {members.map((m, i) => {
              const re = show ? errors.team.rows[i] : { name: "", email: "" };
              return (
                <li key={m.id} className="team-row">
                  <div className="cell">
                    <input
                      type="text" aria-label={`Member ${i + 1} name`} placeholder="Full name" maxLength={NAME_MAX}
                      value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })}
                      aria-invalid={re.name ? "true" : undefined}
                    />
                    {re.name && <p className="error">{re.name}</p>}
                  </div>
                  <div className="cell email">
                    <input
                      type="email" aria-label={`Member ${i + 1} email`} placeholder="name@rknec.edu"
                      value={m.email} onChange={(e) => updateMember(m.id, { email: e.target.value })}
                      aria-invalid={re.email ? "true" : undefined}
                    />
                    {re.email && <p className="error">{re.email}</p>}
                  </div>
                  <button
                    type="button" className="icon-btn" aria-label={`Remove member ${i + 1}`}
                    onClick={() => setMembers((ms) => ms.filter((x) => x.id !== m.id))}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          {show && errors.team.list && <p className="error" role="alert">{errors.team.list}</p>}
          <button
            type="button" className="btn btn-ghost add-row"
            disabled={members.length >= MAX_TEAM}
            onClick={() => setMembers((ms) => [...ms, newMember()])}
          >
            Add member
          </button>
        </div>

        {/* 5. category */}
        <div className={`field section${show && errors.category ? " invalid" : ""}`} tabIndex={-1}>
          <div className="section-head"><h2 className="section-title" id="cat-title">Category</h2></div>
          <div className="chip-group" role="radiogroup" aria-labelledby="cat-title">
            {CATEGORIES.map((c) => (
              <label key={c.id} className="chip">
                <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => pickCategory(c.id)} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          {show && errors.category && <p className="error" role="alert">{errors.category}</p>}
        </div>

        {/* 6. the project itself: depends on the category */}
        {cat && (
          <div className={`field section${show && errors.project ? " invalid" : ""}`} tabIndex={-1}>
            <div className="section-head"><h2 className="section-title">Your project</h2></div>

            {cat.kind === "either" && (
              <div className="seg" role="radiogroup" aria-label="How do you want to submit it?">
                <label><input type="radio" name="mode" checked={mode === "link"} onChange={() => { setMode("link"); setFile(null); }} /><span>Link</span></label>
                <label><input type="radio" name="mode" checked={mode === "file"} onChange={() => { setMode("file"); setLink(""); }} /><span>PDF</span></label>
              </div>
            )}

            {kind === "link" ? (
              <>
                <label htmlFor="link" style={{ marginTop: 8 }}>
                  {cat.id === "game" ? "Link to your hosted game" : "Link to your project"}
                </label>
                <input
                  id="link" type="url" inputMode="url" placeholder="https://" value={link} autoComplete="off"
                  onChange={(e) => setLink(e.target.value)}
                  aria-invalid={show && errors.project ? "true" : undefined} aria-describedby="proj-err"
                />
                <p className="hint">Must start with https://</p>
              </>
            ) : (
              <>
                <p className="hint">
                  {exts.map((e) => "." + e).join(", ")} · up to {limitMb} MB
                </p>
                <div className="file-box">
                  <input
                    id="pfile" type="file" accept={exts.map((e) => "." + e).join(",")}
                    onChange={(e) => { setFile(e.target.files?.[0] || null); e.target.value = ""; }}
                    aria-describedby="proj-err"
                  />
                  <label htmlFor="pfile" className="btn btn-ghost">{file ? "Change file" : "Choose file"}</label>
                  <span className={`file-name${file ? "" : " empty"}`}>{file ? file.name : "No file chosen"}</span>
                </div>
              </>
            )}
            <p id="proj-err" className="error" role={show && errors.project ? "alert" : undefined}>
              {show ? errors.project : ""}
            </p>
          </div>
        )}
      </fieldset>

      {/* 7. send */}
      {confirming ? (
        <div className="confirm" role="alertdialog" aria-label="Confirm upload">
          <p><strong>This sends your project to an admin for review.</strong> It uses your upload while it waits. If it's declined, your upload comes back. If it's approved, you'll need to ask an admin for another. Continue?</p>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={doUpload}>Yes, upload</button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Go back</button>
          </div>
        </div>
      ) : (
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload project"}</button>
        </div>
      )}

      {busy && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Upload progress">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className={`status${status?.type === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
        {busy ? `Uploading… ${progress}%` : status?.text}
      </p>
    </form>
  );
}
