const { Pool } = require("pg");

const DEFAULT_DATABASE_URL = "postgresql://localhost:5432/pomodoro";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
});

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS pomodoros (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    duration_minutes INTEGER NOT NULL DEFAULT 25,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function initSchema(database = pool) {
  await database.query(CREATE_TABLE_SQL);
}

async function checkDatabase(database = pool) {
  try {
    await database.query("SELECT 1");
    return "up";
  } catch {
    return "down";
  }
}

module.exports = {
  DEFAULT_DATABASE_URL,
  CREATE_TABLE_SQL,
  pool,
  initSchema,
  checkDatabase,
};
