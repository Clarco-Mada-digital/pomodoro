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

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readPackage() {
  return JSON.parse(readText("package.json"));
}

test("PF-367 · package.json est un JSON valide et versionné", () => {
  const pkg = readPackage();
  assert.equal(typeof pkg, "object");
  const tracked = git("ls-files", "--error-unmatch", "package.json");
  assert.match(tracked, /package\.json/);
});

test("PF-367 · package.json déclare les métadonnées du projet", () => {
  const pkg = readPackage();
  assert.equal(pkg.name, "playlist-pomodoro-intelligence");
  assert.equal(pkg.private, true);
  assert.ok(pkg.version, "package.json doit déclarer une version");
  assert.ok(
    Array.isArray(pkg.keywords) && pkg.keywords.length > 0,
    "package.json doit déclarer des mots-clés",
  );
  assert.ok(pkg.author, "package.json doit déclarer un auteur");

  const url = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  assert.ok(url, "package.json doit déclarer un champ repository");
  assert.match(url, new RegExp(EXPECTED_REPO.replace("/", "\\/")));
  assert.match(pkg.homepage, /Clarco-Mada-digital\/pomodoro/);
});

test("PF-367 · les scripts de développement et de test sont enregistrés", () => {
  const pkg = readPackage();
  const scripts = pkg.scripts ?? {};
  for (const name of ["dev", "dev:client", "dev:server", "build", "test"]) {
    assert.ok(scripts[name], `le script « ${name} » doit être déclaré`);
  }
  assert.match(scripts.test, /node --test/);
  assert.ok(scripts["test:watch"], "le script « test:watch » doit être déclaré");
  assert.match(scripts["test:watch"], /node --test --watch/);
});

test("PF-367 · les modifications de package.json sont enregistrées (copie propre)", () => {
  assert.equal(
    git("status", "--porcelain", "--", "package.json"),
    "",
    "package.json ne doit pas contenir de modification non committée",
  );
});

test("PF-367 · l'enregistrement de package.json est tracé par un commit PF-367", () => {
  const commits = git("log", "--format=%s", "--", "package.json");
  assert.ok(
    commits.split("\n").some((subject) => subject.startsWith("PF-367")),
    "un commit préfixé « PF-367 » doit toucher package.json",
  );
});

test("PF-367 · le README documente les étapes et les commandes Git de l'enregistrement", () => {
  const readme = readText("README.md");
  assert.match(readme, /PF-367/, "le README doit référencer la tâche PF-367");
  assert.match(
    readme,
    /git commit -m "PF-367/,
    "le README doit citer la commande de commit utilisée",
  );
  assert.match(
    readme,
    /git push origin main/,
    "le README doit citer la commande de push utilisée",
  );
});
