import { useCallback, useEffect, useState } from "react";
import OnboardingFlow from "./components/OnboardingFlow";
import PomodoroTimer from "./components/PomodoroTimer";
import {
  ONBOARDING_STORAGE_KEY,
  createInitialOnboarding,
  parseOnboarding,
  serializeOnboarding,
  type OnboardingDraft,
  type OnboardingState,
} from "./onboarding/core";

type Health = { status: string; database: string };

function loadOnboarding(): OnboardingState {
  try {
    const stored = parseOnboarding(window.localStorage.getItem(ONBOARDING_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // localStorage indisponible (mode privé) : on repart de l'onboarding.
  }
  return createInitialOnboarding();
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => loadOnboarding());

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

  const theme = onboarding.draft.theme;

  useEffect(() => {
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
  }, [theme]);

  const completeOnboarding = useCallback((draft: OnboardingDraft) => {
    const next: OnboardingState = { stepIndex: 0, draft, completed: true };
    setOnboarding(next);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, serializeOnboarding(next));
    } catch {
      // Persistance best-effort : l'application reste utilisable sans localStorage.
    }
  }, []);

  const restartOnboarding = useCallback(() => {
    setOnboarding(createInitialOnboarding());
  }, []);

  if (!onboarding.completed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12">
        <OnboardingFlow initialState={onboarding} onComplete={completeOnboarding} />
      </main>
    );
  }

  const { draft } = onboarding;
  const ambienceLabel = draft.ambience.charAt(0).toUpperCase() + draft.ambience.slice(1);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12">
      <header className="w-full text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          🍅 Playlist-Pomodoro Intelligence
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Bonjour {draft.displayName}, concentration, ambiance {ambienceLabel} et productivité en équipe.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          API :{" "}
          <span className="font-medium">
            {health ? `en ligne (${health.database})` : "hors ligne"}
          </span>
        </p>
        <button
          type="button"
          onClick={restartOnboarding}
          data-testid="restart-onboarding"
          className="mt-3 text-xs font-medium text-focus-700 underline"
        >
          Revoir la configuration
        </button>
      </header>

      <PomodoroTimer
        initialConfig={{ workMinutes: draft.workMinutes, breakMinutes: draft.breakMinutes }}
        initialSoundEnabled={draft.soundEnabled}
      />
    </main>
  );
}
