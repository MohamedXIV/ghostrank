export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;

    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }
}

/**
 * Generates a non-zero 32-bit positive integer seed for fresh simulation runs.
 * Uses cryptographically secure random values when available.
 */
export function generateRunSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const candidate = buffer[0] >>> 0;
    return candidate === 0 ? 1 : candidate;
  }

  const fallback = ((Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
  return fallback === 0 ? 1 : fallback;
}

