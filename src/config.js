// ─────────────────────────────────────────────────────────────
//  Every rule and label for the auth + upload pages lives here.
//  Rules that are also enforced on the server are marked (RULES):
//  if you change one, change firestore.rules / storage.rules too.
// ─────────────────────────────────────────────────────────────

export const BRAND = "DR. ANITA SHARMA"; // SAMPLE: same as the landing page header
export const THEME_KEY = "nc-theme";     // same key as the landing page, so the theme carries over

// Header links (all pages now live in this one site).
export const NAV = [
  { label: "Home", href: "landing.html" },
  { label: "Projects", href: "projects.html" },
  { label: "Upload", href: "upload.html" }
];

export const PAGES = {
  home: "landing.html",
  projects: "projects.html",
  auth: "auth.html",
  upload: "upload.html", // where people land after signing in
  admin: "admin.html"    // only admins see links to this
};

// Rule 1 (RULES): only these email domains may sign up / sign in.
export const ALLOWED_DOMAINS = ["rbunagpur.in", "rknec.edu"];
// Team member emails use the same domains. Set to false to accept any email for team members.
export const TEAM_EMAILS_MUST_MATCH_DOMAINS = true;

// Rule 4 (RULES): at most this many people signed in at once.
export const MAX_SEATS = 80;
export const HEARTBEAT_MS = 2 * 60 * 1000; // a signed-in page "checks in" this often
export const LEASE_MS = 5 * 60 * 1000;     // (RULES: 5 minutes) a seat with no check-in for this long is free again

// Rule 5 (RULES): 5 MB per uploaded file (cover image and project file each).
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const TITLE_MAX = 25;     // (RULES)
export const MAX_TEAM = 6;       // (RULES)
export const NAME_MAX = 40;
export const REASON_MAX = 300;   // (RULES) note on an "upload another" request
export const PASSWORD_MIN = 8;

// kind: "file"  = a file upload
//       "link"  = a link to a hosted site
//       "either" = person picks a link or a file
export const CATEGORIES = [
  { id: "presentation",  label: "Presentation",  kind: "file",   exts: ["pptx", "ppt", "odp", "pdf"] },
  { id: "game",          label: "Game",          kind: "link" },
  { id: "tools-study",   label: "Tools study",   kind: "file",   exts: ["doc", "docx", "pdf"] },
  { id: "ipr",           label: "IPR",           kind: "file",   exts: ["doc", "docx", "pdf"] },
  { id: "certification", label: "Certification", kind: "file",   exts: ["pdf"] },
  { id: "story",         label: "Story",         kind: "file",   exts: ["doc", "docx", "pdf"] },
  { id: "projects",      label: "Projects",      kind: "either", exts: ["pdf"] }
];

// (RULES) storage.rules accepts exactly these content types.
export const MIME = {
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odp: "application/vnd.oasis.opendocument.presentation"
};
