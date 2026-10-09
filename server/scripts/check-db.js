#!/usr/bin/env node
"use strict";

const {
  pool,
  initSchema,
  checkDatabase,
  DEFAULT_DATABASE_URL,
} = require("../src/db");

async function main() {
  const target = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

  if ((await checkDatabase()) !== "up") {
    console.error(`Base de données injoignable : ${target}`);
    console.error("Démarrez PostgreSQL puis relancez « npm run db:check ».");
    process.exitCode = 1;
    return;
  }

  await initSchema();

  const title = `__dbcheck__-${Date.now()}`;
  const inserted = await pool.query(
    "INSERT INTO pomodoros (title, duration_minutes) VALUES ($1, $2) RETURNING id",
    [title, 25],
  );
  const id = inserted.rows[0].id;

  const found = await pool.query(
    "SELECT id, title FROM pomodoros WHERE id = $1",
    [id],
  );
  await pool.query("DELETE FROM pomodoros WHERE id = $1", [id]);

  console.log(`Base accessible : ${target}`);
  console.log(
    `Schema pomodoros OK, aller-retour insert/select/delete OK (id ${id}, ${found.rowCount} ligne retrouvée).`,
  );
}

main()
  .catch((error) => {
    console.error(`Échec de la vérification de la base : ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
