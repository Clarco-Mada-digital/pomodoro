import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_WORK_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  normalizeDuration,
} from "../pomodoro/core.ts";

export { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES } from "../pomodoro/core.ts";

export type AmbienceKey = "neutral" | "jazz" | "lofi" | "classical";
export type ThemePreference = "system" | "light" | "dark";

export type OnboardingStepId = "welcome" | "focus" | "ambience" | "theme" | "review";

export interface AmbienceOption {
  key: AmbienceKey;
  label: string;
  description: string;
}

export interface ThemeOption {
  key: ThemePreference;
  label: string;
  description: string;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  legend: string;
}

export interface OnboardingDraft {
  displayName: string;
  workMinutes: number;
  breakMinutes: number;
  ambience: AmbienceKey;
  theme: ThemePreference;
  soundEnabled: boolean;
}

export interface OnboardingState {
  stepIndex: number;
  draft: OnboardingDraft;
  completed: boolean;
}

export const ONBOARDING_STORAGE_KEY = "playlist-pomodoro.onboarding";
export const ONBOARDING_STORAGE_VERSION = 1;

export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 40;

export const AMBIENCE_OPTIONS: readonly AmbienceOption[] = [
  { key: "neutral", label: "Neutre", description: "Un fond discret qui laisse la place aux pensées." },
  { key: "jazz", label: "Jazz", description: "Des cuivres doux pour les sessions créatives." },
  { key: "lofi", label: "Lo-fi", description: "Un rythme régulier et apaisant pour rester concentré." },
  { key: "classical", label: "Classique", description: "Des cordes calmes pour les longues sessions." },
];

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { key: "system", label: "Système", description: "Suit le réglage clair/sombre de votre appareil." },
  { key: "light", label: "Clair", description: "Un fond lumineux, idéal en journée." },
  { key: "dark", label: "Sombre", description: "Un fond sombre pour réduire la fatigue oculaire." },
];

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bienvenue",
    description: "Faisons connaissance pour personnaliser votre espace.",
    legend: "Étape 1 : Accueil",
  },
  {
    id: "focus",
    title: "Vos sessions",
    description: "Réglez la durée de vos blocs de concentration et de pause.",
    legend: "Étape 2 : Sessions",
  },
  {
    id: "ambience",
    title: "Votre ambiance sonore",
    description: "Choisissez la playlist qui accompagne vos sessions.",
    legend: "Étape 3 : Ambiance",
  },
  {
    id: "theme",
    title: "Votre thème",
    description: "Adaptez la luminosité de l'interface à votre rythme.",
    legend: "Étape 4 : Thème",
  },
  {
    id: "review",
    title: "Tout est prêt",
    description: "Vérifiez votre configuration avant de démarrer.",
    legend: "Étape 5 : Récapitulatif",
  },
];

export const DEFAULT_ONBOARDING_DRAFT: OnboardingDraft = {
  displayName: "",
  workMinutes: DEFAULT_WORK_MINUTES,
  breakMinutes: DEFAULT_BREAK_MINUTES,
  ambience: "lofi",
  theme: "system",
  soundEnabled: true,
};

export const totalSteps = ONBOARDING_STEPS.length;
export const FIRST_STEP_INDEX = 0;
export const LAST_STEP_INDEX = ONBOARDING_STEPS.length - 1;

export function isAmbienceKey(value: unknown): value is AmbienceKey {
  return AMBIENCE_OPTIONS.some((option) => option.key === value);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_OPTIONS.some((option) => option.key === value);
}

export function clampStepIndex(index: number): number {
  if (!Number.isFinite(index)) return FIRST_STEP_INDEX;
  return Math.min(LAST_STEP_INDEX, Math.max(FIRST_STEP_INDEX, Math.floor(index)));
}

export function normalizeDraft(input: Partial<OnboardingDraft> | null | undefined): OnboardingDraft {
  const patch = input ?? {};
  const rawName = typeof patch.displayName === "string" ? patch.displayName : DEFAULT_ONBOARDING_DRAFT.displayName;

  return {
    displayName: rawName,
    workMinutes: normalizeDuration(
      patch.workMinutes ?? DEFAULT_ONBOARDING_DRAFT.workMinutes,
      DEFAULT_ONBOARDING_DRAFT.workMinutes,
    ),
    breakMinutes: normalizeDuration(
      patch.breakMinutes ?? DEFAULT_ONBOARDING_DRAFT.breakMinutes,
      DEFAULT_ONBOARDING_DRAFT.breakMinutes,
    ),
    ambience: isAmbienceKey(patch.ambience) ? patch.ambience : DEFAULT_ONBOARDING_DRAFT.ambience,
    theme: isThemePreference(patch.theme) ? patch.theme : DEFAULT_ONBOARDING_DRAFT.theme,
    soundEnabled:
      typeof patch.soundEnabled === "boolean" ? patch.soundEnabled : DEFAULT_ONBOARDING_DRAFT.soundEnabled,
  };
}

export function createInitialOnboarding(draft?: Partial<OnboardingDraft>): OnboardingState {
  return {
    stepIndex: FIRST_STEP_INDEX,
    draft: normalizeDraft(draft),
    completed: false,
  };
}

export function updateDraft(state: OnboardingState, patch: Partial<OnboardingDraft>): OnboardingState {
  return {
    ...state,
    draft: normalizeDraft({ ...state.draft, ...patch }),
  };
}

export function isLastStep(state: OnboardingState): boolean {
  return clampStepIndex(state.stepIndex) === LAST_STEP_INDEX;
}

export function isFirstStep(state: OnboardingState): boolean {
  return clampStepIndex(state.stepIndex) === FIRST_STEP_INDEX;
}

export function progressPercent(state: OnboardingState): number {
  if (totalSteps <= 1) return 100;
  return Math.round(((clampStepIndex(state.stepIndex) + 1) / totalSteps) * 100);
}

export function validateStep(stepIndex: number, draft: OnboardingDraft): string[] {
  const index = clampStepIndex(stepIndex);
  const errors: string[] = [];

  switch (ONBOARDING_STEPS[index].id) {
    case "welcome": {
      const name = draft.displayName.trim();
      if (name.length < MIN_NAME_LENGTH) {
        errors.push("Indiquez un prénom pour personnaliser votre espace.");
      } else if (name.length > MAX_NAME_LENGTH) {
        errors.push(`Le prénom ne peut pas dépasser ${MAX_NAME_LENGTH} caractères.`);
      }
      break;
    }
    case "focus": {
      if (draft.workMinutes < MIN_DURATION_MINUTES || draft.workMinutes > MAX_DURATION_MINUTES) {
        errors.push(
          `La durée de travail doit être comprise entre ${MIN_DURATION_MINUTES} et ${MAX_DURATION_MINUTES} minutes.`,
        );
      }
      if (draft.breakMinutes < MIN_DURATION_MINUTES || draft.breakMinutes > MAX_DURATION_MINUTES) {
        errors.push(
          `La durée de pause doit être comprise entre ${MIN_DURATION_MINUTES} et ${MAX_DURATION_MINUTES} minutes.`,
        );
      }
      break;
    }
    case "ambience": {
      if (!isAmbienceKey(draft.ambience)) {
        errors.push("Choisissez une ambiance sonore valide.");
      }
      break;
    }
    case "theme": {
      if (!isThemePreference(draft.theme)) {
        errors.push("Choisissez un thème valide.");
      }
      break;
    }
    case "review":
      break;
  }

  return errors;
}

export function isCurrentStepValid(state: OnboardingState): boolean {
  return validateStep(state.stepIndex, state.draft).length === 0;
}

export function canGoNext(state: OnboardingState): boolean {
  if (isLastStep(state)) return false;
  return isCurrentStepValid(state);
}

export function canGoBack(state: OnboardingState): boolean {
  return !isFirstStep(state) && !state.completed;
}

export function goNext(state: OnboardingState): OnboardingState {
  if (state.completed || !canGoNext(state)) return state;
  return { ...state, stepIndex: clampStepIndex(state.stepIndex + 1) };
}

export function goBack(state: OnboardingState): OnboardingState {
  if (state.completed || isFirstStep(state)) return state;
  return { ...state, stepIndex: clampStepIndex(state.stepIndex - 1) };
}

export function goToStep(state: OnboardingState, stepIndex: number): OnboardingState {
  if (state.completed) return state;
  return { ...state, stepIndex: clampStepIndex(stepIndex) };
}

export function completeOnboarding(state: OnboardingState): OnboardingState {
  if (state.completed || !isLastStep(state) || !isCurrentStepValid(state)) return state;
  return {
    ...state,
    draft: { ...state.draft, displayName: state.draft.displayName.trim() },
    completed: true,
  };
}

export function serializeOnboarding(state: OnboardingState): string {
  return JSON.stringify({
    version: ONBOARDING_STORAGE_VERSION,
    stepIndex: clampStepIndex(state.stepIndex),
    draft: state.draft,
    completed: state.completed,
  });
}

export function parseOnboarding(raw: string | null | undefined): OnboardingState | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    if (record.version !== ONBOARDING_STORAGE_VERSION) return null;
    if (typeof record.draft !== "object" || record.draft === null) return null;

    const draft = normalizeDraft(record.draft as Partial<OnboardingDraft>);
    const stepIndex =
      typeof record.stepIndex === "number" ? clampStepIndex(record.stepIndex) : FIRST_STEP_INDEX;

    return {
      stepIndex,
      draft,
      completed: record.completed === true,
    };
  } catch {
    return null;
  }
}
