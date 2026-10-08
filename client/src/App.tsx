import { useEffect, useState } from "react";
import PomodoroTimer from "./components/PomodoroTimer";

type Health = { status: string; database: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => response.json())
      .then((data: Health) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          🍅 Playlist-Pomodoro Intelligence
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Concentration, ambiance intelligente et productivité en équipe.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          API :{" "}
          <span className="font-medium">
            {health ? `en ligne (${health.database})` : "hors ligne"}
          </span>
        </p>
      </header>

      <PomodoroTimer />
    </main>
  );
}
