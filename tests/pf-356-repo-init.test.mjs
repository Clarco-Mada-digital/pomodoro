import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test("PF-356 · le dépôt est initialisé localement", () => {
  assert.ok(existsSync(path.join(repoRoot, ".git")), "le dossier .git doit exister");
  assert.equal(git("rev-parse", "--is-inside-work-tree"), "true");
  assert.equal(git("branch", "--show-current"), "main", "la branche active doit être main");
});

test("PF-356 · le fichier README.md existe et décrit le projet", () => {
  const readmePath = path.join(repoRoot, "README.md");
  assert.ok(existsSync(readmePath), "README.md doit exister à la racine");

  const content = readFileSync(readmePath, "utf8");
  assert.ok(content.trim().length > 0, "README.md ne doit pas être vide");
  assert.match(content, /Playlist-Pomodoro Intelligence/);
  assert.match(content, /React/);
  assert.match(content, /Express/);
  assert.match(content, /PostgreSQL/);
});

test("PF-356 · README.md est bien ajouté (indexé) au dépôt", () => {
  const tracked = git("ls-files", "--error-unmatch", "README.md");
  assert.match(tracked, /README\.md/);
});

test("PF-356 · le premier commit existe sur main avec le préfixe PF-356", () => {
  const commitCount = Number(git("rev-list", "--count", "HEAD"));
  assert.ok(commitCount >= 1, "au moins un commit doit exister");

  const subjects = git("log", "--format=%s").split("\n");
  assert.ok(
    subjects.some((subject) => subject.startsWith("PF-356")),
    "au moins un message de commit doit commencer par « PF-356 »",
  );

  const readmeInHistory = git("log", "--format=%H", "--", "README.md");
  assert.ok(readmeInHistory.length > 0, "README.md doit être versionné dans l'historique");
});
