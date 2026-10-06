import type { DistroSoundIdentity } from "@/presentation/distros";

export type DistroSoundCue = "install" | "stage" | "complete" | "boot";

export function cueNotes(
  identity: DistroSoundIdentity,
  cue: DistroSoundCue,
): readonly number[] {
  return identity[cue];
}

export function playDistroSound(
  identity: DistroSoundIdentity,
  cue: DistroSoundCue,
  enabled: boolean,
): void {
  if (!enabled || typeof window === "undefined") {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  try {
    const context = new AudioContextCtor();
    const notes = cueNotes(identity, cue);
    const now = context.currentTime;

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

    const closeAfter = notes.length * 70 + 180;
    window.setTimeout(() => {
      void context.close();
    }, closeAfter);
  } catch {
    // Audio is optional presentation. Browser policy/device failure is silent.
  }
}
