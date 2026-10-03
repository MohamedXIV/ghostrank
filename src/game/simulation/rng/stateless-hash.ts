/**
 * Stateless deterministic randomness for world systems that must not carry
 * RNG state across saves. The result depends only on the seed and the parts,
 * so replaying the same world minute always yields the same value.
 */
export function hashUnit(
  seed: number,
  ...parts: Array<string | number>
): number {
  let hash = (seed ^ 0x811c9dc5) >>> 0;

  for (const part of parts) {
    const text = String(part);

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    // Separator so ("ab","c") and ("a","bc") differ.
    hash ^= 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d) >>> 0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b) >>> 0;
  hash ^= hash >>> 16;

  return (hash >>> 0) / 4_294_967_296;
}
