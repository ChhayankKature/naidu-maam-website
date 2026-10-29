import test from "node:test";
import assert from "node:assert/strict";
import {
  emailShapeProblem, emailProblem, titleProblem, coverProblem, fileProblem, linkProblem, looksLikeWebp,
  teamProblems, projectProblem, memberNameProblem
} from "../src/validation.js";

const f = (name, size = 1000, type = "") => ({ name, size, type });
const MB = 1024 * 1024;

test("rule 1: only the two college domains", () => {
  assert.equal(emailProblem("a.b@rknec.edu"), "");
  assert.equal(emailProblem("A.B@RBUNagpur.in"), "");           // case-insensitive
  assert.equal(emailProblem("  a@rknec.edu "), "");              // trimmed
  assert.notEqual(emailProblem("a@gmail.com"), "");
  assert.notEqual(emailProblem("a@evil-rknec.edu"), "");
  assert.notEqual(emailProblem("a@rknec.edu.evil.com"), "");
  assert.notEqual(emailProblem("a@sub.rknec.edu"), "");
  assert.notEqual(emailProblem("a+1@rknec.edu"), "");            // + alias would be a 2nd upload
  assert.notEqual(emailProblem("rknec.edu"), "");
  assert.notEqual(emailProblem(""), "");
});

test("title: letters only, 1 to 25", () => {
  assert.equal(titleProblem("MyProject"), "");
  assert.equal(titleProblem("a".repeat(25)), "");
  assert.notEqual(titleProblem("a".repeat(26)), "");
  assert.notEqual(titleProblem("My Project"), "");
  assert.notEqual(titleProblem("Project2"), "");
  assert.notEqual(titleProblem("Café"), "");
  assert.notEqual(titleProblem("a-b"), "");
  assert.notEqual(titleProblem(""), "");
});

test("rule 5: 5 MB limit on cover and project files", () => {
  assert.equal(coverProblem(f("a.webp", 5 * MB, "image/webp")), "");
  assert.notEqual(coverProblem(f("a.webp", 5 * MB + 1, "image/webp")), "");
  assert.notEqual(coverProblem(f("a.webp", 0)), "");
  assert.equal(fileProblem(f("a.pdf", 5 * MB), ["pdf"]), "");
  assert.notEqual(fileProblem(f("a.pdf", 5 * MB + 1), ["pdf"]), "");
});

test("cover must be webp", () => {
  assert.notEqual(coverProblem(f("a.png", 10, "image/png")), "");
  assert.notEqual(coverProblem(f("a.jpg", 10, "image/jpeg")), "");
  assert.notEqual(coverProblem(f("a.webp", 10, "image/png")), "");   // renamed png
  assert.equal(coverProblem(f("A.WEBP", 10, "")), "");
  assert.notEqual(coverProblem(null), "");
});

test("webp magic bytes", async () => {
  const mk = (s) => new Blob([s + "\0\0\0\0".repeat(2)]);
  assert.equal(await looksLikeWebp(new Blob(["RIFF\x10\0\0\0WEBPVP8 "])), true);
  assert.equal(await looksLikeWebp(new Blob(["\x89PNG\r\n\x1a\n\0\0\0\rIHDR"])), false);
  assert.equal(await looksLikeWebp(mk("tiny")), false);
});

test("category -> allowed project upload", () => {
  const p = (category, file, extra = {}) => projectProblem({ category, file, link: "", mode: "file", ...extra });
  // presentation
  assert.equal(p("presentation", f("a.pptx")), "");
  assert.equal(p("presentation", f("a.pdf")), "");
  assert.notEqual(p("presentation", f("a.docx")), "");
  // tools study / story / ipr: doc or pdf
  for (const c of ["tools-study", "story", "ipr"]) {
    assert.equal(p(c, f("a.doc")), "");
    assert.equal(p(c, f("a.docx")), "");
    assert.equal(p(c, f("a.pdf")), "");
    assert.notEqual(p(c, f("a.pptx")), "");
    assert.notEqual(p(c, f("a.exe")), "");
  }
  // certification: pdf only
  assert.equal(p("certification", f("a.pdf")), "");
  assert.notEqual(p("certification", f("a.docx")), "");
  // game: link only
  assert.equal(projectProblem({ category: "game", link: "https://x.github.io/game" }), "");
  assert.notEqual(projectProblem({ category: "game", file: f("a.pdf") }), "");
  // projects: a link or a pdf
  assert.equal(projectProblem({ category: "projects", mode: "link", link: "https://example.com/p" }), "");
  assert.equal(projectProblem({ category: "projects", mode: "file", file: f("a.pdf") }), "");
  assert.notEqual(projectProblem({ category: "projects", mode: "file", file: f("a.docx") }), "");
  assert.notEqual(projectProblem({ category: "nope" }), "");
});

test("links must be https", () => {
  assert.equal(linkProblem("https://my.site/game"), "");
  assert.notEqual(linkProblem("http://my.site"), "");
  assert.notEqual(linkProblem("javascript:alert(1)"), "");
  assert.notEqual(linkProblem("my.site"), "");
  assert.notEqual(linkProblem("https://localhost"), "");
  assert.notEqual(linkProblem(""), "");
});

test("team: 1 to 6 members, names and college emails", () => {
  const m = (name, email) => ({ name, email });
  const ok = [m("Asha Rao", "asha@rknec.edu")];
  assert.equal(teamProblems(ok).any, false);
  assert.equal(teamProblems(Array.from({ length: 6 }, (_, i) => m("Name", `n${i}@rknec.edu`))).any, false);
  assert.equal(teamProblems(Array.from({ length: 7 }, (_, i) => m("Name", `n${i}@rknec.edu`))).any, true);
  assert.equal(teamProblems([]).any, true);
  assert.equal(teamProblems([m("", "a@rknec.edu")]).any, true);
  assert.equal(teamProblems([m("Asha", "asha@gmail.com")]).any, true);
  assert.equal(teamProblems([m("A", "a@rknec.edu"), m("B", "a@rknec.edu")]).any, true); // duplicate
  assert.notEqual(memberNameProblem("R2D2"), "");
});

test("sign-in and reset only check the shape, so an admin can use any email", () => {
  assert.equal(emailShapeProblem("admin@gmail.com"), "");
  assert.equal(emailShapeProblem("  Admin@Example.org "), "");
  assert.notEqual(emailShapeProblem(""), "");
  assert.notEqual(emailShapeProblem("not-an-email"), "");
  // sign-up still needs a college email
  assert.notEqual(emailProblem("admin@gmail.com"), "");
});
