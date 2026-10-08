import { useCallback, useEffect, useRef, useState } from "react";

export type PomodoroPhase = "work" | "break";

const WORK_DURATION_SECONDS = 25 * 60;
const BREAK_DURATION_SECONDS = 5 * 60;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function PomodoroTimer() {
  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [remaining, setRemaining] = useState(WORK_DURATION_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current !== null) return;
    setRunning(true);
    intervalRef.current = window.setInterval(() => {
      setRemaining((previous) => {
        if (previous <= 1) {
          setPhase((current) => (current === "work" ? "break" : "work"));
          return phase === "work" ? BREAK_DURATION_SECONDS : WORK_DURATION_SECONDS;
        }
        return previous - 1;
      });
    }, 1000);
  }, [phase]);

  const reset = useCallback(() => {
    stop();
    setPhase("work");
    setRemaining(WORK_DURATION_SECONDS);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {phase === "work" ? "Session de concentration" : "Pause régénérante"}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            phase === "work"
              ? "bg-focus-50 text-focus-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {phase === "work" ? "25 min" : "5 min"}
        </span>
      </header>

      <p
        className="text-center font-mono text-6xl font-bold tracking-tight"
        aria-live="polite"
      >
        {formatTime(remaining)}
      </p>

      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          onClick={running ? stop : start}
          className="rounded-xl bg-focus-500 px-6 py-2 font-medium text-white transition hover:bg-focus-700"
        >
          {running ? "Pause" : "Démarrer"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-slate-300 px-6 py-2 font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
