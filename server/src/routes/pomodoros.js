const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/", async (_request, response, next) => {
  try {
    const result = await pool.query(
      "SELECT id, title, completed, duration_minutes, created_at FROM pomodoros ORDER BY created_at DESC",
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  const { title, durationMinutes = 25 } = request.body ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    response.status(400).json({ error: "Le titre de la tâche est requis." });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO pomodoros (title, duration_minutes)
       VALUES ($1, $2)
       RETURNING id, title, completed, duration_minutes, created_at`,
      [title.trim(), durationMinutes],
    );
    response.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/complete", async (request, response, next) => {
  try {
    const result = await pool.query(
      "UPDATE pomodoros SET completed = TRUE WHERE id = $1 RETURNING id, title, completed",
      [request.params.id],
    );

    if (result.rowCount === 0) {
      response.status(404).json({ error: "Tâche introuvable." });
      return;
    }

    response.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
