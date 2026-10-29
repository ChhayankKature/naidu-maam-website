import { domainList } from "../validation.js";

// The "you were just signed out" messages, shared by both pages.
export default function Notices({ notice }) {
  if (!notice) return null;
  if (notice.type === "full") return <div className="notice" role="alert"><strong>All seats are in use</strong>Only 80 people can be signed in at once. Try again in a few minutes.</div>;
  if (notice.type === "lost") return <div className="notice" role="alert"><strong>You were signed out</strong>Your seat was taken while you were away and no seats are free. Try again in a few minutes.</div>;
  if (notice.type === "domain") return <div className="notice" role="alert"><strong>That email can't be used</strong>Only {domainList()} emails are allowed.</div>;
  if (notice.type === "blocked") return (
    <div className="notice" role="alert">
      <strong>Your account has been blocked</strong>
      An admin has blocked this account from uploading.{notice.reason ? ` Reason given: ${notice.reason}` : ""} Contact an admin if you think this is a mistake.
    </div>
  );
  return null;
}
