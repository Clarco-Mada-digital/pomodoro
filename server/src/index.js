const http = require("http");
const cors = require("cors");
const express = require("express");
const { Server } = require("socket.io");

const { initSchema, checkDatabase } = require("./db");
const pomodorosRouter = require("./routes/pomodoros");

const PORT = Number(process.env.PORT) || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_request, response) => {
  response.json({ status: "ok", database: await checkDatabase() });
});

app.use("/api/pomodoros", pomodorosRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Erreur interne du serveur." });
});

io.on("connection", (socket) => {
  socket.on("pomodoro:started", (session) => {
    socket.broadcast.emit("pomodoro:started", session);
  });

  socket.on("task:updated", (task) => {
    socket.broadcast.emit("task:updated", task);
  });
});

initSchema()
  .catch((error) => console.warn("Schéma non initialisé :", error.message))
  .finally(() => {
    server.listen(PORT, () => {
      console.log(`API Playlist-Pomodoro Intelligence sur http://localhost:${PORT}`);
    });
  });
