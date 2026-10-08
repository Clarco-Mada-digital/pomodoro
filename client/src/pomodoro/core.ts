export type PomodoroPhase = "work" | "break";
export type PomodoroStatus = "idle" | "running" | "paused";

export interface PomodoroConfig {
  workMinutes: number;
  breakMinutes: number;
}

export interface TimerState {
  phase: PomodoroPhase;
  remaining: number;
  status: PomodoroStatus;
}

export interface TickResult {
  state: TimerState;
  sessionEnded: boolean;
}

export const DEFAULT_WORK_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 90;

export const DEFAULT_CONFIG: PomodoroConfig = {
  workMinutes: DEFAULT_WORK_MINUTES,
  breakMinutes: DEFAULT_BREAK_MINUTES,
};

export function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function normalizeDuration(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(value)));
}

export function nextPhase(phase: PomodoroPhase): PomodoroPhase {
  return phase === "work" ? "break" : "work";
}

export function durationForPhase(phase: PomodoroPhase, config: PomodoroConfig): number {
  const minutes = phase === "work" ? config.workMinutes : config.breakMinutes;
  return minutes * 60;
}

export function createInitialTimer(config: PomodoroConfig): TimerState {
  return {
    phase: "work",
    remaining: durationForPhase("work", config),
    status: "idle",
  };
}

export function resetTimer(config: PomodoroConfig): TimerState {
  return createInitialTimer(config);
}

export function startTimer(state: TimerState): TimerState {
  if (state.status === "running") return state;
  return { ...state, status: "running" };
}

export function pauseTimer(state: TimerState): TimerState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused" };
}

export function applyConfig(state: TimerState, config: PomodoroConfig): TimerState {
  if (state.status === "running") return state;
  return { ...state, remaining: durationForPhase(state.phase, config) };
}

export function advanceTimer(state: TimerState, config: PomodoroConfig): TickResult {
  if (state.status !== "running") {
    return { state, sessionEnded: false };
  }

  if (state.remaining <= 1) {
    const phase = nextPhase(state.phase);
    return {
      state: {
        phase,
        remaining: durationForPhase(phase, config),
        status: "paused",
      },
      sessionEnded: true,
    };
  }

  return {
    state: { ...state, remaining: state.remaining - 1 },
    sessionEnded: false,
  };
}
