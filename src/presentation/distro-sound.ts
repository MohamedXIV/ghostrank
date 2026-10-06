import type { DistroSoundIdentity } from "@/presentation/distros";

export type DistroSoundCue = "install" | "stage" | "complete" | "boot";

let sharedContext: AudioContext | null = null;

export function cueNotes(
  identity: DistroSoundIdentity,
  cue: DistroSoundCue,
): readonly number[] {
  return identity[cue];
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (sharedContext && sharedContext.state !== "closed") {
    return sharedContext;
  }

  const AudioContextCtor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  try {
    sharedContext = new AudioContextCtor();
    return sharedContext;
  } catch {
    return null;
  }
}

export function playDistroSound(
  identity: DistroSoundIdentity,
  cue: DistroSoundCue,
  enabled: boolean,
): void {
  if (!enabled) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  try {
    if (context.state === "suspended") {
      void context.resume();
    }

    const notes = cueNotes(identity, cue);
    const now = context.currentTime + 0.01;

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.07;
      const stop = start + 0.09;

      oscillator.type = identity.waveform;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(identity.gain, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(stop);
    });
  } catch {
    // Audio is optional presentation. Browser policy/device failure is silent.
  }
}
