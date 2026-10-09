import { useMemo, useState } from "react";
import {
  AMBIENCE_OPTIONS,
  MAX_DURATION_MINUTES,
  MAX_NAME_LENGTH,
  MIN_DURATION_MINUTES,
  ONBOARDING_STEPS,
  THEME_OPTIONS,
  canGoBack,
  canGoNext,
  completeOnboarding,
  createInitialOnboarding,
  goBack,
  goNext,
  isLastStep,
  progressPercent,
  updateDraft,
  validateStep,
  type AmbienceKey,
  type OnboardingDraft,
  type OnboardingState,
  type ThemePreference,
} from "../onboarding/core";

export interface OnboardingFlowProps {
  initialState?: OnboardingState;
  onComplete: (draft: OnboardingDraft) => void;
}

const controlButton =
  "rounded-xl px-5 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

const fieldClasses =
  "mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600";

const optionCardClasses = (selected: boolean) =>
  `flex flex-col gap-1 rounded-xl border p-4 text-left transition ${
    selected
      ? "border-focus-500 bg-focus-50 dark:bg-slate-800"
      : "border-slate-200 hover:border-focus-500 dark:border-slate-700"
  }`;

export default function OnboardingFlow({ initialState, onComplete }: OnboardingFlowProps) {
  const [state, setState] = useState<OnboardingState>(() => initialState ?? createInitialOnboarding());

  const step = ONBOARDING_STEPS[state.stepIndex];
  const errors = useMemo(
    () => validateStep(state.stepIndex, state.draft),
    [state.stepIndex, state.draft],
  );
  const progress = progressPercent(state);
  const lastStep = isLastStep(state);

  const patch = (changes: Partial<OnboardingDraft>) =>
    setState((previous) => updateDraft(previous, changes));

  const handleNext = () => setState((previous) => goNext(previous));
  const handleBack = () => setState((previous) => goBack(previous));

  const handleFinish = () => {
    const completed = completeOnboarding(state);
    setState(completed);
    if (completed.completed) onComplete(completed.draft);
  };

  const changeDuration = (key: "workMinutes" | "breakMinutes", raw: string) => {
    if (raw.trim() === "") return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    patch(key === "workMinutes" ? { workMinutes: parsed } : { breakMinutes: parsed });
  };

  return (
    <section
      className="mx-auto w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900"
      aria-label="Flux d'onboarding"
      data-testid="onboarding-flow"
    >
      <header className="mb-6">
        <p className="text-sm font-medium text-focus-700" data-testid="onboarding-step-legend">
          {step.legend}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight" data-testid="onboarding-step-title">
          {step.title}
        </h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{step.description}</p>

        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Progression de l'onboarding"
          data-testid="onboarding-progress"
        >
          <div
            className="h-full rounded-full bg-focus-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">
          {step.legend.replace("Étape ", "Étape ")} — {progress}%
        </p>
      </header>

      <div className="min-h-[12rem]" data-testid="onboarding-step">
        {step.id === "welcome" && (
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Comment vous appelez-vous ?</span>
            <input
              type="text"
              value={state.draft.displayName}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => patch({ displayName: event.target.value })}
              placeholder="Votre prénom"
              data-testid="onboarding-name"
              className={fieldClasses}
            />
          </label>
        )}

        {step.id === "focus" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Travail (min)</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_DURATION_MINUTES}
                max={MAX_DURATION_MINUTES}
                value={state.draft.workMinutes}
                onChange={(event) => changeDuration("workMinutes", event.target.value)}
                data-testid="onboarding-work"
                className={fieldClasses}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Pause (min)</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_DURATION_MINUTES}
                max={MAX_DURATION_MINUTES}
                value={state.draft.breakMinutes}
                onChange={(event) => changeDuration("breakMinutes", event.target.value)}
                data-testid="onboarding-break"
                className={fieldClasses}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={state.draft.soundEnabled}
                onChange={(event) => patch({ soundEnabled: event.target.checked })}
                data-testid="onboarding-sound-toggle"
              />
              <span className="text-slate-600 dark:text-slate-300">
                Notification sonore en fin de session
              </span>
            </label>
          </div>
        )}

        {step.id === "ambience" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Ambiance sonore">
            {AMBIENCE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={state.draft.ambience === option.key}
                onClick={() => patch({ ambience: option.key as AmbienceKey })}
                data-testid={`onboarding-ambience-${option.key}`}
                className={optionCardClasses(state.draft.ambience === option.key)}
              >
                <span className="font-semibold">{option.label}</span>
                <span className="text-sm text-slate-500">{option.description}</span>
              </button>
            ))}
          </div>
        )}

        {step.id === "theme" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Thème">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={state.draft.theme === option.key}
                onClick={() => patch({ theme: option.key as ThemePreference })}
                data-testid={`onboarding-theme-${option.key}`}
                className={optionCardClasses(state.draft.theme === option.key)}
              >
                <span className="font-semibold">{option.label}</span>
                <span className="text-sm text-slate-500">{option.description}</span>
              </button>
            ))}
          </div>
        )}

        {step.id === "review" && (
          <dl className="space-y-3 text-sm" data-testid="onboarding-review">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Prénom</dt>
              <dd className="font-medium">{state.draft.displayName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Sessions</dt>
              <dd className="font-medium">
                {state.draft.workMinutes} min de travail / {state.draft.breakMinutes} min de pause
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Ambiance</dt>
              <dd className="font-medium">
                {AMBIENCE_OPTIONS.find((option) => option.key === state.draft.ambience)?.label}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Thème</dt>
              <dd className="font-medium">
                {THEME_OPTIONS.find((option) => option.key === state.draft.theme)?.label}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Son</dt>
              <dd className="font-medium">{state.draft.soundEnabled ? "Activé" : "Désactivé"}</dd>
            </div>
          </dl>
        )}
      </div>

      {errors.length > 0 && (
        <ul
          className="mt-4 list-inside list-disc text-sm text-red-600"
          data-testid="onboarding-errors"
          aria-live="polite"
        >
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={!canGoBack(state)}
          data-testid="onboarding-back"
          className={`${controlButton} border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800`}
        >
          Précédent
        </button>

        {lastStep ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={errors.length > 0}
            data-testid="onboarding-finish"
            className={`${controlButton} bg-focus-500 text-white hover:bg-focus-700`}
          >
            Terminer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext(state)}
            data-testid="onboarding-next"
            className={`${controlButton} bg-focus-500 text-white hover:bg-focus-700`}
          >
            Suivant
          </button>
        )}
      </div>
    </section>
  );
}
