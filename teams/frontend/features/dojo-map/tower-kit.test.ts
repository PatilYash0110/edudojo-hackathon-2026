import { describe, expect, it } from 'vitest';
import { rng } from './tower-kit';

/** The original signed-int mulberry32 the tower was designed with (int32 wrap via BigInt). */
const int32 = (value: number) => Number(BigInt.asIntN(32, BigInt(value)));

function signedMulberry32(seed: number) {
  let state = int32(seed);
  return () => {
    state = int32(state + 0x6d2b79f5);
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('tower rng', () => {
  it('produces exactly the sequence of the signed mulberry32, so the tower looks the same', () => {
    for (const seed of [0, 1, 7, 42, 2024, 0x7fffffff, 0xdeadbeef, -5]) {
      const next = rng(seed);
      const reference = signedMulberry32(seed);
      for (let i = 0; i < 2000; i++) expect(next(), `seed ${seed} step ${i}`).toBe(reference());
    }
  });
});
