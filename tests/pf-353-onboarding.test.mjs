import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  AMBIENCE_OPTIONS,
  DEFAULT_ONBOARDING_DRAFT,
  FIRST_STEP_INDEX,
  LAST_STEP_INDEX,
  MAX_NAME_LENGTH,
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  THEME_OPTIONS,
  canGoBack,
  canGoNext,
  clampStepIndex,
  completeOnboarding,
  createInitialOnboarding,
  goBack,
  goNext,
  goToStep,
  isCurrentStepValid,
  isFirstStep,
  isLastStep,
  parseOnboarding,
  progressPercent,
  serializeOnboarding,
  totalSteps,
  updateDraft,
  validateStep,
} from "../client/src/onboarding/core.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (...parts) =>
  readFileSync(path.join(repoRoot, ...parts), "utf8");

const onboardingSource = readSource("client", "src", "components", "OnboardingFlow.tsx");
const appSource = readSource("client", "src", "App.tsx");

test("PF-353 · le flux d'onboarding est composé de 5 étapes ordonnées", () => {
  assert.equal(totalSteps, 5);
  assert.equal(FIRST_STEP_INDEX, 0);
  assert.equal(LAST_STEP_INDEX, 4);
  assert.deepEqual(
    ONBOARDING_STEPS.map((step) => step.id),
    ["welcome", "focus", "ambience", "theme", "review"],
  );
  for (const step of ONBOARDING_STEPS) {
    assert.ok(step.title.length > 0, "chaque étape possède un titre");
    assert.ok(step.legend.length > 0, "chaque étape possède une légende");
  }
});

test("PF-353 · l'onboarding démarre à la première étape avec des valeurs par défaut", () => {
  const state = createInitialOnboarding();
  assert.deepEqual(state, {
    stepIndex: 0,
    draft: {
      displayName: "",
      workMinutes: 25,
      breakMinutes: 5,
      ambience: "lofi",
      theme: "system",
      soundEnabled: true,
    },
    completed: false,
  });
  assert.equal(state.draft.ambience, DEFAULT_ONBOARDING_DRAFT.ambience);
  assert.ok(AMBIENCE_OPTIONS.some((option) => option.key === "lofi"));
  assert.ok(THEME_OPTIONS.some((option) => option.key === "system"));
});

test("PF-353 · mettre à jour le brouillon normalise et valide les préférences", () => {
  const initial = createInitialOnboarding();

  const updated = updateDraft(initial, {
    displayName: "Bryan",
    workMinutes: 50,
    breakMinutes: 12.6,
    ambience: "jazz",
    theme: "dark",
    soundEnabled: false,
  });

  assert.equal(updated.draft.displayName, "Bryan");
  assert.equal(updated.draft.workMinutes, 50);
  assert.equal(updated.draft.breakMinutes, 13, "les minutes sont arrondies");
  assert.equal(updated.draft.ambience, "jazz");
  assert.equal(updated.draft.theme, "dark");
  assert.equal(updated.draft.soundEnabled, false);

  const clamped = updateDraft(initial, { workMinutes: 9999, breakMinutes: -4 });
  assert.equal(clamped.draft.workMinutes, 90);
  assert.equal(clamped.draft.breakMinutes, 1);

  const invalid = updateDraft(initial, {
    ambience: "techno",
    theme: "neon",
    soundEnabled: "oui",
  });
  assert.equal(invalid.draft.ambience, "lofi", "une ambiance inconnue retombe sur la valeur par défaut");
  assert.equal(invalid.draft.theme, "system", "un thème inconnu retombe sur la valeur par défaut");
  assert.equal(invalid.draft.soundEnabled, true);
});

test("PF-353 · chaque étape possède ses propres règles de validation", () => {
  const base = createInitialOnboarding();

  assert.equal(validateStep(0, base.draft).length, 1, "un prénom est requis");
  assert.equal(validateStep(0, { ...base.draft, displayName: "  " }).length, 1);
  assert.ok(validateStep(0, { ...base.draft, displayName: "a".repeat(MAX_NAME_LENGTH + 1) }).length > 0);
  assert.deepEqual(validateStep(0, { ...base.draft, displayName: "Bryan" }), []);

  assert.deepEqual(validateStep(1, base.draft), []);
  assert.equal(validateStep(1, { ...base.draft, workMinutes: 0 }).length, 1);
  assert.equal(validateStep(1, { ...base.draft, breakMinutes: 100 }).length, 1);

  assert.deepEqual(validateStep(2, { ...base.draft, ambience: "neutral" }), []);
  assert.equal(validateStep(2, { ...base.draft, ambience: "unknown" }).length, 1);

  assert.deepEqual(validateStep(3, { ...base.draft, theme: "light" }), []);
  assert.equal(validateStep(3, { ...base.draft, theme: "unknown" }).length, 1);

  assert.deepEqual(validateStep(4, base.draft), [], "le récapitulatif ne bloque pas");
});

test("PF-353 · la navigation avance, recule et respecte les bornes", () => {
  let state = createInitialOnboarding();
  assert.equal(isFirstStep(state), true);
  assert.equal(isLastStep(state), false);
  assert.equal(canGoBack(state), false, "pas de retour sur la première étape");
  assert.equal(canGoNext(state), false, "un prénom est requis pour avancer");

  state = updateDraft(state, { displayName: "Bryan" });
  assert.equal(isCurrentStepValid(state), true);
  assert.equal(canGoNext(state), true);

  state = goNext(state);
  assert.equal(state.stepIndex, 1);
  assert.equal(canGoBack(state), true);

  state = goBack(state);
  assert.equal(state.stepIndex, 0);

  const clampedLow = goToStep(state, -10);
  assert.equal(clampedLow.stepIndex, 0);
  const clampedHigh = goToStep(state, 99);
  assert.equal(clampedHigh.stepIndex, LAST_STEP_INDEX);
  assert.equal(clampStepIndex(Number.NaN), 0);

  let atLast = createInitialOnboarding({ displayName: "Bryan" });
  for (let i = 0; i < 10; i += 1) atLast = goNext(atLast);
  assert.equal(atLast.stepIndex, LAST_STEP_INDEX, "on ne dépasse pas la dernière étape");
  assert.equal(canGoNext(atLast), false);
  assert.equal(goNext(atLast), atLast, "goNext est sans effet sur la dernière étape");
  assert.equal(goBack(atLast).stepIndex, LAST_STEP_INDEX - 1);
});

test("PF-353 · l'onboarding se termine uniquement sur l'étape récapitulative valide", () => {
  const notReady = createInitialOnboarding({ displayName: "Bryan" });
  assert.equal(completeOnboarding(notReady).completed, false, "impossible de terminer depuis l'étape 1");

  const atLast = goToStep(createInitialOnboarding({ displayName: "  Bryan  " }), LAST_STEP_INDEX);
  const completed = completeOnboarding(atLast);

  assert.equal(completed.completed, true);
  assert.equal(completed.draft.displayName, "Bryan", "le prénom est nettoyé des espaces");
  assert.equal(isCurrentStepValid(completed), true);

  assert.equal(goNext(completed), completed, "on ne navigue plus après la fin");
  assert.equal(goBack(completed), completed);
  assert.equal(goToStep(completed, 0), completed);
  assert.equal(canGoBack(completed), false);
});

test("PF-353 · la progression reste entre 0 et 100 %", () => {
  const first = createInitialOnboarding();
  assert.equal(progressPercent(first), 20);

  const last = goToStep(first, LAST_STEP_INDEX);
  assert.equal(progressPercent(last), 100);

  const mid = goToStep(first, 2);
  assert.equal(progressPercent(mid), 60);
});

test("PF-353 · l'état d'onboarding est sérialisé puis restauré", () => {
  const state = goToStep(createInitialOnboarding({ displayName: "Bryan", workMinutes: 45 }), LAST_STEP_INDEX);
  const completed = completeOnboarding(state);

  const raw = serializeOnboarding(completed);
  assert.equal(typeof raw, "string");

  const parsed = parseOnboarding(raw);
  assert.deepEqual(parsed, completed);

  assert.equal(parseOnboarding(null), null);
  assert.equal(parseOnboarding(""), null);
  assert.equal(parseOnboarding("pas du json"), null);
  assert.equal(parseOnboarding(JSON.stringify({ version: 99, draft: {} })), null, "version inconnue rejetée");
  assert.equal(parseOnboarding(JSON.stringify({ version: 1 })), null, "brouillon manquant rejeté");

  const repaired = parseOnboarding(
    JSON.stringify({
      version: 1,
      stepIndex: 42,
      draft: { displayName: "Bryan", workMinutes: 5000, breakMinutes: -3, ambience: "x", theme: "y" },
      completed: "yes",
    }),
  );
  assert.equal(repaired.stepIndex, LAST_STEP_INDEX, "l'index est borné à la restauration");
  assert.equal(repaired.draft.workMinutes, 90);
  assert.equal(repaired.draft.breakMinutes, 1);
  assert.equal(repaired.draft.ambience, "lofi");
  assert.equal(repaired.draft.theme, "system");
  assert.equal(repaired.completed, false, "completed n'est vrai que pour un booléen true");
});

test("PF-353 · la clé de stockage est stable", () => {
  assert.equal(ONBOARDING_STORAGE_KEY, "playlist-pomodoro.onboarding");
});

test("PF-353 · le composant React expose les étapes et la navigation", () => {
  assert.match(onboardingSource, /ONBOARDING_STEPS/);
  assert.match(onboardingSource, /validateStep/);
  assert.match(onboardingSource, /completeOnboarding/);
  assert.match(onboardingSource, /goNext/);
  assert.match(onboardingSource, /goBack/);
  assert.match(onboardingSource, /progressPercent/);
  assert.match(onboardingSource, /data-testid="onboarding-flow"/);
  assert.match(onboardingSource, /data-testid="onboarding-next"/);
  assert.match(onboardingSource, /data-testid="onboarding-back"/);
  assert.match(onboardingSource, /data-testid="onboarding-finish"/);
  assert.match(onboardingSource, /role="progressbar"/);
  assert.match(onboardingSource, /Suivant/);
  assert.match(onboardingSource, /Précédent/);
  assert.match(onboardingSource, /Terminer/);
  assert.match(onboardingSource, /step\.id === "welcome"/);
  assert.match(onboardingSource, /step\.id === "review"/);
});

test("PF-353 · l'application branche le flux d'onboarding et le persiste", () => {
  assert.match(appSource, /import OnboardingFlow from "\.\/components\/OnboardingFlow"/);
  assert.match(appSource, /ONBOARDING_STORAGE_KEY/);
  assert.match(appSource, /serializeOnboarding/);
  assert.match(appSource, /parseOnboarding/);
  assert.match(appSource, /createInitialOnboarding/);
  assert.match(appSource, /!onboarding\.completed/);
  assert.match(appSource, /initialConfig=\{\{ workMinutes: draft\.workMinutes, breakMinutes: draft\.breakMinutes \}\}/);
  assert.match(appSource, /initialSoundEnabled=\{draft\.soundEnabled\}/);
});
