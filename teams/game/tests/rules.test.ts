import { describe, expect, it } from 'vitest';

import { nextDifficulty } from '@/teams/game/mastery/difficulty';
import { masteryStatus, updateMastery } from '@/teams/game/mastery/mastery-rules';
import { levelForXp, xpForAnswer } from '@/teams/game/progression/xp-levels';

describe('first-version rules', () => {
  it('moves mastery toward the score and stays in 0..1', () => {
    expect(updateMastery(0, 1)).toBe(0.35);
    expect(updateMastery(1, 0)).toBe(0.65);
    expect(updateMastery(0.9, 1)).toBeLessThanOrEqual(1);
  });

  it('classifies mastery', () => {
    expect(masteryStatus(0, 0)).toBe('new');
    expect(masteryStatus(0.85, 3)).toBe('mastered');
    expect(masteryStatus(0.3, 2)).toBe('needs_review');
    expect(masteryStatus(0.3, 1)).toBe('learning');
  });

  it('picks difficulty and levels', () => {
    expect([nextDifficulty(0.1), nextDifficulty(0.5), nextDifficulty(0.9)]).toEqual([1, 2, 3]);
    expect(xpForAnswer(true)).toBe(10);
    expect(xpForAnswer(false)).toBe(0);
    expect([levelForXp(0), levelForXp(50), levelForXp(200)]).toEqual([1, 2, 3]);
  });
});
