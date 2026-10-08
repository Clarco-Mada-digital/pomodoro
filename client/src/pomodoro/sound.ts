export const SESSION_END_CHIME_HZ = [880, 1174.66] as const;
export const CHIME_NOTE_GAP_SECONDS = 0.18;
export const CHIME_NOTE_DURATION_SECONDS = 0.55;

function createBrowserContext(): AudioContext | null {
  const globals = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextCtor = globals.AudioContext ?? globals.webkitAudioContext;
  if (!AudioContextCtor) return null;
  try {
    return new AudioContextCtor();
  } catch {
    return null;
  }
}

function scheduleNote(context: AudioContext, frequency: number, startAt: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + CHIME_NOTE_DURATION_SECONDS);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + CHIME_NOTE_DURATION_SECONDS);
}

export function playSessionEndChime(context?: AudioContext): void {
  const audioContext = context ?? createBrowserContext();
  if (!audioContext) return;

  if (typeof audioContext.resume === "function") {
    void audioContext.resume().catch(() => undefined);
  }

  const baseTime = audioContext.currentTime;
  SESSION_END_CHIME_HZ.forEach((frequency, index) => {
    scheduleNote(audioContext, frequency, baseTime + index * CHIME_NOTE_GAP_SECONDS);
  });
}
