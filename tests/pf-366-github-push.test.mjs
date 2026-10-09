import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_REPO = "Clarco-Mada-digital/pomodoro";

function git(...args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test("PF-366 · le dépôt distant origin pointe vers Clarco-Mada-digital/pomodoro", () => {
  const url = git("remote", "get-url", "origin");
  assert.match(
    url,
    /^(https:\/\/github\.com\/|git@github\.com:)/,
    "origin doit être une URL GitHub (HTTPS ou SSH)",
  );

  const normalized = url.replace(/\.git$/, "").replace(/^git@github\.com:/, "https://github.com/");
  assert.ok(
    normalized.endsWith(EXPECTED_REPO),
    `origin doit pointer vers ${EXPECTED_REPO}, trouvé : ${url}`,
  );
});

test("PF-366 · la branche main est configurée pour suivre origin/main", () => {
  assert.equal(git("branch", "--show-current"), "main", "la branche active doit être main");
  assert.equal(git("config", "--get", "branch.main.remote"), "origin");
  assert.equal(git("config", "--get", "branch.main.merge"), "refs/heads/main");
});

test("PF-366 · package.json est versionné et déclare le dépôt GitHub", () => {
  const tracked = git("ls-files", "--error-unmatch", "package.json");
  assert.match(tracked, /package\.json/);

  const committed = git("log", "--format=%H", "--", "package.json");
  assert.ok(committed.length > 0, "package.json doit être présent dans l'historique des commits");

  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const url = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  assert.ok(url, "package.json doit déclarer un champ repository");
  assert.match(url, /Clarco-Mada-digital\/pomodoro/);
});

test("PF-366 · la copie de travail est propre (prête à être poussée)", () => {
  assert.equal(
    git("status", "--porcelain"),
    "",
    "aucune modification non committée ne doit rester avant le push",
  );
});

test("PF-366 · main contient au moins un commit poussable", () => {
  const count = Number(git("rev-list", "--count", "main"));
  assert.ok(count >= 1, "main doit contenir au moins un commit à pousser");
  assert.ok(git("rev-parse", "--verify", "HEAD").length > 0);
});
