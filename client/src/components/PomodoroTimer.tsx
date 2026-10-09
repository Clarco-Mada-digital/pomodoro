import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_CONFIG,
  DEFAULT_WORK_MINUTES,
  advanceTimer,
  applyConfig,
  createInitialTimer,
  durationForPhase,
  formatTime,
  normalizeDuration,
  pauseTimer,
  resetTimer,
  startTimer,
  type PomodoroConfig,
  type PomodoroPhase,
  type TimerState,
} from "../pomodoro/core";
import { playSessionEndChime } from "../pomodoro/sound";

export type { PomodoroPhase };

export interface PomodoroTimerProps {
  initialConfig?: PomodoroConfig;
  initialSoundEnabled?: boolean;
}

const DURATION_ATTRIBUTES = {
  min: 1,
  max: 90,
} as const;

export default function PomodoroTimer({
  initialConfig = DEFAULT_CONFIG,
  initialSoundEnabled = true,
}: PomodoroTimerProps = {}) {
  const [config, setConfig] = useState<PomodoroConfig>(initialConfig);
  const [timer, setTimer] = useState<TimerState>(() => createInitialTimer(initialConfig));
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [workField, setWorkField] = useState(String(initialConfig.workMinutes));
  const [breakField, setBreakField] = useState(String(initialConfig.breakMinutes));

  const timerRef = useRef(timer);
  const configRef = useRef(config);
  const soundRef = useRef(soundEnabled);
  timerRef.current = timer;
  configRef.current = config;
  soundRef.current = soundEnabled;

  useEffect(() => {
    if (timer.status !== "running") return undefined;

    const intervalId = window.setInterval(() => {
      const { state, sessionEnded } = advanceTimer(timerRef.current, configRef.current);
      timerRef.current = state;
      setTimer(state);

      if (sessionEnded) {
        window.clearInterval(intervalId);
        if (soundRef.current) playSessionEndChime();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timer.status]);

  const start = useCallback(() => setTimer((previous) => startTimer(previous)), []);
  const pause = useCallback(() => setTimer((previous) => pauseTimer(previous)), []);
  const reset = useCallback(() => {
    setTimer(resetTimer(configRef.current));
  }, []);

  const updateDuration = useCallback(
    (patch: Partial<PomodoroConfig>) => {
      const next: PomodoroConfig = {
        workMinutes: normalizeDuration(
          patch.workMinutes ?? configRef.current.workMinutes,
          DEFAULT_WORK_MINUTES,
        ),
        breakMinutes: normalizeDuration(
          patch.breakMinutes ?? configRef.current.breakMinutes,
          DEFAULT_BREAK_MINUTES,
        ),
      };
      setConfig(next);
      setTimer((previous) => applyConfig(previous, next));
    },
    [],
  );

  const changeWorkField = (raw: string) => {
    setWorkField(raw);
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    updateDuration({ workMinutes: parsed });
  };

  const changeBreakField = (raw: string) => {
    setBreakField(raw);
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    updateDuration({ breakMinutes: parsed });
  };

  const statusLabel =
    timer.status === "running"
      ? "Session en cours"
      : timer.status === "paused"
        ? "En pause"
        : "Prêt à démarrer";

  const controlButton =
    "rounded-xl px-5 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section
      className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900"
      aria-label="Minuteur Pomodoro"
    >
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {timer.phase === "work" ? "Session de concentration" : "Pause régénérante"}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            timer.phase === "work"
              ? "bg-focus-50 text-focus-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {durationForPhase(timer.phase, config) / 60} min
        </span>
      </header>

      <p
        className="text-center font-mono text-6xl font-bold tracking-tight"
        aria-live="polite"
        data-testid="time-display"
      >
        {formatTime(timer.remaining)}
      </p>
      <p className="mt-2 text-center text-sm text-slate-500" data-testid="timer-status">
        {statusLabel}
      </p>

      <div
        className="mt-8 flex flex-wrap justify-center gap-3"
        role="group"
        aria-label="Commandes du minuteur"
      >
        <button
          type="button"
          onClick={start}
          disabled={timer.status === "running"}
          data-testid="start-button"
          className={`${controlButton} bg-focus-500 text-white hover:bg-focus-700`}
        >
          Lancer
        </button>
        <button
          type="button"
          onClick={pause}
          disabled={timer.status !== "running"}
          data-testid="pause-button"
          className={`${controlButton} bg-amber-500 text-white hover:bg-amber-600`}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={reset}
          title="Reset"
          data-testid="reset-button"
          className={`${controlButton} border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800`}
        >
          Réinitialiser
        </button>
      </div>

      <fieldset className="mt-8 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <legend className="px-2 text-sm font-semibold">Configuration des durées</legend>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Travail (min)</span>
            <input
              type="number"
              inputMode="numeric"
              min={DURATION_ATTRIBUTES.min}
              max={DURATION_ATTRIBUTES.max}
              value={workField}
              onChange={(event) => changeWorkField(event.target.value)}
              onBlur={() => setWorkField(String(config.workMinutes))}
              data-testid="work-duration-input"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Pause (min)</span>
            <input
              type="number"
              inputMode="numeric"
              min={DURATION_ATTRIBUTES.min}
              max={DURATION_ATTRIBUTES.max}
              value={breakField}
              onChange={(event) => changeBreakField(event.target.value)}
              onBlur={() => setBreakField(String(config.breakMinutes))}
              data-testid="break-duration-input"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(event) => setSoundEnabled(event.target.checked)}
            data-testid="sound-toggle"
          />
          <span className="text-slate-600 dark:text-slate-300">
            Notification sonore en fin de session
          </span>
        </label>
      </fieldset>
    </section>
  );
}
