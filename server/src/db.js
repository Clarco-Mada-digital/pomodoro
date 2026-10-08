const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/pomodoro",
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

async function initSchema() {
  await pool.query(CREATE_TABLE_SQL);
}

async function checkDatabase() {
  try {
    await pool.query("SELECT 1");
    return "up";
  } catch {
    return "down";
  }
}

module.exports = { pool, initSchema, checkDatabase };
