import { describe, expect, it } from 'vitest';

import { BATTLE_BALANCE, DECAY } from '@/teams/game/balance/balance';
import {
  byRetention,
  DAY_MS,
  floorRetention,
  freshMemory,
  needsRepair,
  rematchEnemyHp,
  rememberMissing,
  retention,
  reviewObjectives,
  type DojoMemory,
} from '@/teams/game/mastery/decay';

const T0 = Date.UTC(2026, 9, 24);

describe('forgetting curve', () => {
  it('starts full and falls to 1/e after one stability period', () => {
    const memory = freshMemory(T0);
    expect(retention(memory, T0)).toBe(1);
    expect(retention(memory, T0 + DECAY.initialStabilityDays * DAY_MS)).toBeCloseTo(Math.exp(-1));
  });

  it('never exceeds 1 for clock skew into the past', () => {
    expect(retention(freshMemory(T0), T0 - DAY_MS)).toBe(1);
  });

  it('averages a floor over objectives that were fought', () => {
    const memory: DojoMemory = {
      a: freshMemory(T0),
      b: { lastReviewedAt: T0 - 2 * DAY_MS, stabilityDays: 2 },
    };
    expect(floorRetention(['a', 'b', 'never'], memory, T0)).toBeCloseTo((1 + Math.exp(-1)) / 2);
    expect(floorRetention(['never'], memory, T0)).toBeNull();
  });

  it('flags floors for repair below the threshold', () => {
    expect(needsRepair(null)).toBe(false);
    expect(needsRepair(0.95)).toBe(false);
    expect(needsRepair(DECAY.repairBelow - 0.01)).toBe(true);
  });
});

describe('rematch', () => {
  it('gives the guardian the forgotten share of its HP, with a minimum', () => {
    expect(rematchEnemyHp(0)).toBe(BATTLE_BALANCE.enemyHp);
    expect(rematchEnemyHp(0.5)).toBe(BATTLE_BALANCE.enemyHp / 2);
    expect(rematchEnemyHp(0.99)).toBe(DECAY.minRematchHp);
  });

  it('orders objectives most forgotten first', () => {
    const memory: DojoMemory = {
      fresh: freshMemory(T0),
      old: { lastReviewedAt: T0 - 5 * DAY_MS, stabilityDays: 2 },
      mid: { lastReviewedAt: T0 - DAY_MS, stabilityDays: 2 },
    };
    expect(byRetention(['fresh', 'mid', 'old', 'unknown'], memory, T0)).toEqual([
      'old',
      'mid',
      'fresh',
      'unknown',
    ]);
  });
});

describe('review after a won battle', () => {
  const later = T0 + 3 * DAY_MS;
  const before: DojoMemory = {
    recalled: freshMemory(T0),
    missed: { lastReviewedAt: T0, stabilityDays: 8 },
    skipped: { lastReviewedAt: T0, stabilityDays: 4 },
  };

  it('grows stability for recalled objectives and resets missed ones', () => {
    const after = reviewObjectives(
      before,
      ['recalled', 'missed', 'skipped', 'new'],
      [
        { objectiveId: 'recalled', correct: true },
        { objectiveId: 'recalled', correct: true },
        { objectiveId: 'missed', correct: false },
        { objectiveId: 'missed', correct: true },
      ],
      later,
    );
    expect(after.recalled).toEqual({
      lastReviewedAt: later,
      stabilityDays: DECAY.initialStabilityDays * 2,
    });
    expect(after.missed).toEqual({
      lastReviewedAt: later,
      stabilityDays: DECAY.initialStabilityDays,
    });
    expect(after.skipped).toEqual({ lastReviewedAt: later, stabilityDays: 4 });
    expect(after.new).toEqual(freshMemory(later));
  });

  it('caps stability', () => {
    const after = reviewObjectives(
      { a: { lastReviewedAt: T0, stabilityDays: DECAY.maxStabilityDays } },
      ['a'],
      [{ objectiveId: 'a', correct: true }],
      later,
    );
    expect(after.a.stabilityDays).toBe(DECAY.maxStabilityDays);
  });

  it('fills in floors cleared before decay existed, without touching known ones', () => {
    const known = { a: { lastReviewedAt: T0, stabilityDays: 5 } };
    expect(rememberMissing(known, ['a'], later)).toBe(known);
    expect(rememberMissing(known, ['a', 'b'], later)).toEqual({ ...known, b: freshMemory(later) });
  });
});
