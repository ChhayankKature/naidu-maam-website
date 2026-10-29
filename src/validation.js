// Pure checks, no Firebase here, so they can be tested on their own (npm test).
import {
  ALLOWED_DOMAINS, TEAM_EMAILS_MUST_MATCH_DOMAINS, MAX_FILE_BYTES, TITLE_MAX,
  NAME_MAX, MAX_TEAM, PASSWORD_MIN, REASON_MAX, CATEGORIES
} from "./config.js";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (s) => String(s || "").trim().toLowerCase();
export const domainList = () => ALLOWED_DOMAINS.map((d) => "@" + d).join(" or ");
export const getExt = (name) => {
  const i = String(name || "").lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
};
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) || null;
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

/** Rule 1. Returns "" when the email is fine, otherwise a message. */
export function emailProblem(raw) {
  const email = normalizeEmail(raw);
  if (!email) return "Enter your email.";
  if (!EMAIL_SHAPE.test(email)) return "Enter a valid email address.";
  const [local, domain] = email.split("@");
  if (!ALLOWED_DOMAINS.includes(domain)) return `Only ${domainList()} emails are allowed.`;
  if (local.includes("+")) return "Email addresses containing + aren't allowed.";
  return "";
}

/** Shape only. Used for sign-in and password reset, where an admin may use a non-college email.
 *  Whether the account may do anything is decided after sign-in (admin check) and by the security rules. */
export function emailShapeProblem(raw) {
  const email = normalizeEmail(raw);
  if (!email) return "Enter your email.";
  if (!EMAIL_SHAPE.test(email)) return "Enter a valid email address.";
  return "";
}

export function passwordProblem(pw) {
  if (!pw) return "Enter a password.";
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  return "";
}

/** Letters a-z / A-Z only, 1 to 25 of them. */
export function titleProblem(t) {
  if (!t) return "Enter a project title.";
  if (t.length > TITLE_MAX) return `Keep the title to ${TITLE_MAX} characters.`;
  if (!/^[A-Za-z]+$/.test(t)) return "Use letters A–Z only: no spaces, numbers or symbols.";
  return "";
}

export function memberNameProblem(n) {
  const v = String(n || "").trim();
  if (!v) return "Enter a name.";
  if (v.length > NAME_MAX) return `Keep names to ${NAME_MAX} characters.`;
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(v)) return "Use letters only (spaces, . ' - are fine).";
  return "";
}

export function memberEmailProblem(raw) {
  if (TEAM_EMAILS_MUST_MATCH_DOMAINS) return emailProblem(raw);
  const email = normalizeEmail(raw);
  if (!email) return "Enter an email.";
  return EMAIL_SHAPE.test(email) ? "" : "Enter a valid email address.";
}

/** Returns one { name, email } error object per member, plus a list-level error. */
export function teamProblems(members) {
  const rows = members.map(() => ({ name: "", email: "" }));
  let list = "";
  if (members.length < 1) list = "Add at least one team member (you can add yourself).";
  if (members.length > MAX_TEAM) list = `A team can have at most ${MAX_TEAM} members.`;
  const seen = new Set();
  members.forEach((m, i) => {
    rows[i].name = memberNameProblem(m.name);
    rows[i].email = memberEmailProblem(m.email);
    const e = normalizeEmail(m.email);
    if (!rows[i].email && seen.has(e)) rows[i].email = "This email is already on the team.";
    seen.add(e);
  });
  return { rows, list, any: !!list || rows.some((r) => r.name || r.email) };
}

/** Cover must be .webp and at most 5 MB. */
export function coverProblem(file) {
  if (!file) return "Choose a cover image.";
  if (getExt(file.name) !== "webp" || (file.type && file.type !== "image/webp")) return "The cover must be a WebP image (.webp).";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return `The image is ${mb(file.size)} MB; the limit is 5 MB.`;
  return "";
}

/** Checks the first bytes: a real WebP starts with "RIFF" … "WEBP". */
export async function looksLikeWebp(file) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const s = (from, to) => String.fromCharCode(...b.slice(from, to));
  return b.length >= 12 && s(0, 4) === "RIFF" && s(8, 12) === "WEBP";
}

export function fileProblem(file, exts) {
  if (!file) return "Choose a file.";
  const ext = getExt(file.name);
  if (!exts.includes(ext)) return `Allowed file types: ${exts.map((e) => "." + e).join(", ")}.`;
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_FILE_BYTES) return `The file is ${mb(file.size)} MB; the limit is 5 MB.`;
  return "";
}

export function linkProblem(raw) {
  const v = String(raw || "").trim();
  if (!v) return "Enter the link.";
  if (v.length > 500) return "Keep the link under 500 characters.";
  let u;
  try { u = new URL(v); } catch { return "Enter a full link that starts with https://"; }
  if (u.protocol !== "https:") return "The link must start with https://";
  if (!u.hostname.includes(".")) return "Enter a valid link.";
  return "";
}

export function reasonProblem(r) {
  return String(r || "").length > REASON_MAX ? `Keep the note under ${REASON_MAX} characters.` : "";
}

/** The project part of the form depends on the category. */
export function projectProblem({ category, mode, file, link }) {
  const cat = getCategory(category);
  if (!cat) return "Choose a category.";
  const kind = cat.kind === "either" ? mode : cat.kind;
  if (kind === "link") return linkProblem(link);
  return fileProblem(file, cat.exts);
}
