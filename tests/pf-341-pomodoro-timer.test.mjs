import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_CONFIG,
  DEFAULT_WORK_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  advanceTimer,
  applyConfig,
  createInitialTimer,
  durationForPhase,
  formatTime,
  nextPhase,
  normalizeDuration,
  pauseTimer,
  resetTimer,
  startTimer,
} from "../client/src/pomodoro/core.ts";
import {
  SESSION_END_CHIME_HZ,
  playSessionEndChime,
} from "../client/src/pomodoro/sound.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timerSource = readFileSync(
  path.join(repoRoot, "client", "src", "components", "PomodoroTimer.tsx"),
  "utf8",
);

test("PF-341 · le temps restant s'affiche au format mm:ss", () => {
  assert.equal(formatTime(0), "00:00");
  assert.equal(formatTime(59), "00:59");
  assert.equal(formatTime(60), "01:00");
  assert.equal(formatTime(5 * 60), "05:00");
  assert.equal(formatTime(25 * 60), "25:00");
  assert.equal(formatTime(25 * 60 + 7), "25:07");
  assert.equal(formatTime(-10), "00:00");
});

test("PF-341 · la configuration par défaut est 25 min de travail / 5 min de pause", () => {
  assert.equal(DEFAULT_WORK_MINUTES, 25);
  assert.equal(DEFAULT_BREAK_MINUTES, 5);
  assert.deepEqual(DEFAULT_CONFIG, { workMinutes: 25, breakMinutes: 5 });
  assert.equal(durationForPhase("work", DEFAULT_CONFIG), 25 * 60);
  assert.equal(durationForPhase("break", DEFAULT_CONFIG), 5 * 60);
});

test("PF-341 · les durées configurées sont bornées et arrondies", () => {
  assert.equal(normalizeDuration(50, 25), 50);
  assert.equal(normalizeDuration(12.6, 25), 13);
  assert.equal(normalizeDuration(0, 25), MIN_DURATION_MINUTES);
  assert.equal(normalizeDuration(-30, 25), MIN_DURATION_MINUTES);
  assert.equal(normalizeDuration(5000, 25), MAX_DURATION_MINUTES);
  assert.equal(normalizeDuration(Number.NaN, 45), 45);
});

test("PF-341 · le minuteur démarre, se met en pause et se réinitialise", () => {
  const initial = createInitialTimer(DEFAULT_CONFIG);
  assert.deepEqual(initial, {
    phase: "work",
    remaining: 25 * 60,
    status: "idle",
  });

  const running = startTimer(initial);
  assert.equal(running.status, "running");

  const paused = pauseTimer(running);
  assert.equal(paused.status, "paused");
  assert.deepEqual(pauseTimer(paused), paused, "une pause déjà en pause ne change rien");

  const reset = resetTimer({ workMinutes: 40, breakMinutes: 10 });
  assert.deepEqual(reset, { phase: "work", remaining: 40 * 60, status: "idle" });
});

test("PF-341 · le compte à rebours décrémente d'une seconde par tick", () => {
  const running = startTimer(createInitialTimer(DEFAULT_CONFIG));

  const first = advanceTimer(running, DEFAULT_CONFIG);
  assert.equal(first.sessionEnded, false);
  assert.equal(first.state.remaining, 25 * 60 - 1);
  assert.equal(first.state.phase, "work");
  assert.equal(first.state.status, "running");

  const second = advanceTimer(first.state, DEFAULT_CONFIG);
  assert.equal(second.state.remaining, 25 * 60 - 2);
});

test("PF-341 · un minuteur en pause ne avance pas", () => {
  const paused = pauseTimer(startTimer(createInitialTimer(DEFAULT_CONFIG)));
  const result = advanceTimer(paused, DEFAULT_CONFIG);
  assert.equal(result.sessionEnded, false);
  assert.deepEqual(result.state, paused);
});

test("PF-341 · la fin d'une session de travail bascule en pause et signale la fin", () => {
  const state = { phase: "work", remaining: 1, status: "running" };
  const result = advanceTimer(state, DEFAULT_CONFIG);

  assert.equal(result.sessionEnded, true);
  assert.equal(result.state.phase, "break");
  assert.equal(result.state.remaining, DEFAULT_BREAK_MINUTES * 60);
  assert.equal(result.state.status, "paused", "le minuteur attend l'utilisateur avant la pause");
});

test("PF-341 · la fin d'une pause bascule en travail", () => {
  const config = { workMinutes: 50, breakMinutes: 10 };
  const state = { phase: "break", remaining: 1, status: "running" };
  const result = advanceTimer(state, config);

  assert.equal(result.sessionEnded, true);
  assert.equal(result.state.phase, "work");
  assert.equal(result.state.remaining, 50 * 60);
  assert.equal(nextPhase("break"), "work");
  assert.equal(nextPhase("work"), "break");
});

test("PF-341 · changer une durée s'applique au minuteur à l'arrêt", () => {
  const idle = createInitialTimer(DEFAULT_CONFIG);
  const reconfigured = applyConfig(idle, { workMinutes: 45, breakMinutes: 15 });
  assert.equal(reconfigured.remaining, 45 * 60);

  const onBreak = applyConfig(
    { phase: "break", remaining: 120, status: "paused" },
    { workMinutes: 45, breakMinutes: 15 },
  );
  assert.equal(onBreak.remaining, 15 * 60);

  const running = startTimer(createInitialTimer(DEFAULT_CONFIG));
  const stillRunning = applyConfig(running, { workMinutes: 45, breakMinutes: 15 });
  assert.deepEqual(stillRunning, running, "on ne tronque pas une session en cours");
});

function createFakeAudioContext() {
  const events = [];
  const context = {
    currentTime: 2,
    destination: { label: "haut-parleurs" },
    resume: async () => {
      events.push({ type: "resume" });
    },
    createOscillator() {
      return {
        type: "sine",
        frequency: {
          value: 0,
          setValueAtTime: (value, at) => events.push({ type: "frequency", value, at }),
        },
        connect: (destination) => events.push({ type: "connect-oscillator", destination }),
        start: (at) => events.push({ type: "start", at }),
        stop: (at) => events.push({ type: "stop", at }),
      };
    },
    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: (value, at) => events.push({ type: "gain-set", value, at }),
          exponentialRampToValueAtTime: (value, at) =>
            events.push({ type: "gain-ramp", value, at }),
        },
        connect: (destination) => events.push({ type: "connect-gain", destination }),
      };
    },
  };
  return { context, events };
}

test("PF-341 · une notification sonore est jouée en fin de session", () => {
  const { context, events } = createFakeAudioContext();

  playSessionEndChime(context);

  const starts = events.filter((event) => event.type === "start");
  const stops = events.filter((event) => event.type === "stop");
  const frequencies = events
    .filter((event) => event.type === "frequency")
    .map((event) => event.value);
  const gainConnects = events.filter((event) => event.type === "connect-gain");

  assert.equal(starts.length, SESSION_END_CHIME_HZ.length, "une note par événement de fin");
  assert.equal(stops.length, SESSION_END_CHIME_HZ.length);
  assert.deepEqual(frequencies, [...SESSION_END_CHIME_HZ]);
  assert.ok(starts[0].at >= context.currentTime, "les notes sont planifiées sur l'horloge audio");
  assert.ok(
    gainConnects.every((event) => event.destination === context.destination),
    "les notes sont reliées à la sortie audio",
  );
  assert.ok(events.some((event) => event.type === "resume"));
  assert.ok(
    events.some((event) => event.type === "gain-ramp" && event.value < 1),
    "l'enveloppe du gain atténue la note",
  );
});

test("PF-341 · le son ne plante pas quand l'API Web Audio est indisponible", () => {
  assert.doesNotThrow(() => playSessionEndChime());
});

test("PF-341 · l'interface expose Lancer / Pause / Réinitialiser en mm:ss", () => {
  assert.match(timerSource, /Lancer/);
  assert.match(timerSource, /Pause/);
  assert.match(timerSource, /Réinitialiser/);
  assert.match(timerSource, /title="Reset"/);
  assert.match(timerSource, /formatTime\(timer\.remaining\)/);
  assert.match(timerSource, /aria-live="polite"/);
});

test("PF-341 · l'interface déclenche la notification sonore en fin de session", () => {
  assert.match(timerSource, /playSessionEndChime/);
  assert.match(timerSource, /soundEnabled/);
  assert.match(timerSource, /Notification sonore/);
});

test("PF-341 · l'interface permet de configurer la durée des sessions", () => {
  assert.match(timerSource, /Configuration des durées/);
  assert.match(timerSource, /type="number"/);
  assert.match(timerSource, /workMinutes/);
  assert.match(timerSource, /breakMinutes/);
  assert.match(timerSource, /normalizeDuration/);
});
