import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import database from "../server/src/db.js";

const { CREATE_TABLE_SQL, DEFAULT_DATABASE_URL, initSchema, checkDatabase } =
  database;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(...segments) {
  return readFileSync(path.join(repoRoot, ...segments), "utf8");
}

const dbSource = read("server", "src", "db.js");
const indexSource = read("server", "src", "index.js");
const readme = read("README.md");
const rootPackage = JSON.parse(read("package.json"));
const serverPackage = JSON.parse(read("server", "package.json"));

test("PF-374 · la couche base de données cible PostgreSQL via le paquet pg", () => {
  assert.match(dbSource, /require\(["']pg["']\)/, "db.js doit utiliser le pilote pg");
  assert.match(dbSource, /process\.env\.DATABASE_URL/);
  assert.match(dbSource, /postgresql:\/\//, "une URL PostgreSQL par défaut doit exister");
  assert.equal(DEFAULT_DATABASE_URL, "postgresql://localhost:5432/pomodoro");
});

test("PF-374 · le schéma pomodoros est créé de façon idempotente", () => {
  assert.match(CREATE_TABLE_SQL, /CREATE TABLE IF NOT EXISTS pomodoros/i);
  assert.match(CREATE_TABLE_SQL, /created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
  assert.match(CREATE_TABLE_SQL, /duration_minutes INTEGER NOT NULL DEFAULT 25/i);
});

test("PF-374 · initSchema exécute la création du schéma sur la base fournie", async () => {
  const queries = [];
  const fakeDatabase = {
    query: async (sql) => {
      queries.push(sql);
      return { rows: [] };
    },
  };

  await initSchema(fakeDatabase);

  assert.equal(queries.length, 1);
  assert.match(queries[0], /CREATE TABLE IF NOT EXISTS pomodoros/i);
});

test("PF-374 · checkDatabase renvoie « up » quand la base répond", async () => {
  const queries = [];
  const fakeDatabase = {
    query: async (sql) => {
      queries.push(sql);
      return { rows: [{ ok: 1 }] };
    },
  };

  assert.equal(await checkDatabase(fakeDatabase), "up");
  assert.deepEqual(queries, ["SELECT 1"]);
});

test("PF-374 · checkDatabase renvoie « down » sans jamais propager l'erreur", async () => {
  const failing = {
    query: async () => {
      throw new Error("ECONNREFUSED : aucune base à l'écoute");
    },
  };

  await assert.doesNotReject(() => checkDatabase(failing));
  assert.equal(await checkDatabase(failing), "down");
});

test("PF-374 · l'API expose le statut de la base sur /api/health", () => {
  assert.match(indexSource, /app\.get\(\s*["']\/api\/health["']/);
  assert.match(indexSource, /checkDatabase\(/);
  assert.match(indexSource, /initSchema\(/);
});

test("PF-374 · le serveur déclare la dépendance PostgreSQL pg", () => {
  assert.ok(serverPackage.dependencies?.pg, "server/package.json doit dépendre de pg");
});

test("PF-374 · le script de vérification de la base est fourni", () => {
  const scriptPath = path.join(repoRoot, "server", "scripts", "check-db.js");
  assert.ok(existsSync(scriptPath), "server/scripts/check-db.js doit exister");
  assert.equal(rootPackage.scripts?.["db:check"], "node server/scripts/check-db.js");

  const scriptSource = readFileSync(scriptPath, "utf8");
  assert.match(scriptSource, /checkDatabase/);
  assert.match(scriptSource, /initSchema/);
});

test("PF-374 · le README documente la création et la configuration de la base", () => {
  assert.match(readme, /##\s*.*Base de données/i);
  assert.match(readme, /createdb pomodoro/);
  assert.match(readme, /DATABASE_URL/);
  assert.match(readme, /npm run db:check/);
  assert.match(readme, /\/api\/health/);
});

test("PF-374 · le README acte la décision PostgreSQL (et non SQLite)", () => {
  assert.match(readme, /PF-374/);
  assert.match(readme, /SQLite/);
  assert.match(readme, /PostgreSQL/);
  assert.match(
    readme,
    /Résultats de (la )?vérification/i,
    "le README doit publier les résultats des tests de base",
  );
});

test(
  "PF-374 · aller-retour réel sur une base PostgreSQL accessible",
  { skip: process.env.DATABASE_URL ? false : "DATABASE_URL non défini (base non fournie)" },
  async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      assert.equal(await checkDatabase(pool), "up", "DATABASE_URL doit être joignable");
      await initSchema(pool);

      const title = `__pf374__-${Date.now()}`;
      const inserted = await pool.query(
        "INSERT INTO pomodoros (title, duration_minutes) VALUES ($1, $2) RETURNING id",
        [title, 25],
      );
      const found = await pool.query("SELECT title FROM pomodoros WHERE id = $1", [
        inserted.rows[0].id,
      ]);
      assert.equal(found.rows[0].title, title);

      await pool.query("DELETE FROM pomodoros WHERE id = $1", [inserted.rows[0].id]);
    } finally {
      await pool.end();
    }
  },
);
