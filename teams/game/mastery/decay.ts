/**
 * Floors that decay: what a learner remembers of each objective fades along a forgetting curve.
 *
 * OWNER: GAME TEAM. Pure rules; the caller stores `DojoMemory` and passes `now` in.
 * Retention is computed on read from `lastReviewedAt` and `stabilityDays`, so nothing has to
 * tick in the background and stored values never drift.
 */
import { BATTLE_BALANCE, DECAY } from '../balance/balance';

export const DAY_MS = 86_400_000;

export interface ObjectiveMemory {
  /** Epoch ms of the last battle that reviewed this objective. */
  lastReviewedAt: number;
  /** Days until retention falls to 1/e (≈37%). Grows with every successful review. */
  stabilityDays: number;
}

/** Objective id → memory. Objectives never fought have no entry. */
export type DojoMemory = Record<string, ObjectiveMemory>;

/** One graded answer from a battle, as far as decay is concerned. */
export interface ReviewAnswer {
  objectiveId: string;
  correct: boolean;
}

export function freshMemory(now: number): ObjectiveMemory {
  return { lastReviewedAt: now, stabilityDays: DECAY.initialStabilityDays };
}

/** 0..1 share still remembered. */
export function retention(memory: ObjectiveMemory, now: number): number {
  const days = Math.max(0, now - memory.lastReviewedAt) / DAY_MS;
  const stability = Math.max(memory.stabilityDays, 1e-6);
  return Math.exp(-days / stability);
}

/** Average retention over a floor's objectives that have been fought; `null` if none have. */
export function floorRetention(
  objectiveIds: readonly string[],
  memory: DojoMemory,
  now: number,
): number | null {
  const known = objectiveIds.flatMap((id) => (memory[id] ? [retention(memory[id], now)] : []));
  if (known.length === 0) return null;
  return known.reduce((sum, value) => sum + value, 0) / known.length;
}

export function needsRepair(floorRetentionValue: number | null): boolean {
  return floorRetentionValue !== null && floorRetentionValue < DECAY.repairBelow;
}

/** The rematch guardian comes back with as much HP as the learner has forgotten. */
export function rematchEnemyHp(floorRetentionValue: number): number {
  const forgotten = 1 - Math.min(1, Math.max(0, floorRetentionValue));
  return Math.max(DECAY.minRematchHp, Math.round(BATTLE_BALANCE.enemyHp * forgotten));
}

/** Objective ids, most forgotten first. Objectives without memory count as fully remembered. */
export function byRetention(
  objectiveIds: readonly string[],
  memory: DojoMemory,
  now: number,
): string[] {
  const score = (id: string) => (memory[id] ? retention(memory[id], now) : 1);
  return objectiveIds
    .map((id, index) => ({ id, index, value: score(id) }))
    .sort((a, b) => a.value - b.value || a.index - b.index)
    .map(({ id }) => id);
}

/**
 * Memory after a won battle on these objectives.
 * - First time an objective is fought: fresh memory.
 * - Recalled (more right than wrong answers): reviewed now, stability grows.
 * - Asked but mostly missed: reviewed now, but stability starts over.
 * - Not asked: reviewed now with its stability kept, because winning the floor repairs it.
 * Lost battles change nothing, so the caller only calls this on victory.
 */
export function reviewObjectives(
  memory: DojoMemory,
  objectiveIds: readonly string[],
  answers: readonly ReviewAnswer[],
  now: number,
): DojoMemory {
  const next: DojoMemory = { ...memory };
  for (const id of objectiveIds) {
    const previous = memory[id];
    if (!previous) {
      next[id] = freshMemory(now);
      continue;
    }
    const mine = answers.filter((answer) => answer.objectiveId === id);
    const right = mine.filter((answer) => answer.correct).length;
    const wrong = mine.length - right;
    if (mine.length === 0) {
      next[id] = { ...previous, lastReviewedAt: now };
    } else if (right > wrong) {
      next[id] = {
        lastReviewedAt: now,
        stabilityDays: Math.min(
          DECAY.maxStabilityDays,
          previous.stabilityDays * DECAY.stabilityGrowth,
        ),
      };
    } else {
      next[id] = freshMemory(now);
    }
  }
  return next;
}

/** Objectives with no memory yet start fresh at `now` (floors cleared before decay existed). */
export function rememberMissing(
  memory: DojoMemory,
  objectiveIds: readonly string[],
  now: number,
): DojoMemory {
  const missing = objectiveIds.filter((id) => !memory[id]);
  if (missing.length === 0) return memory;
  const next = { ...memory };
  for (const id of missing) next[id] = freshMemory(now);
  return next;
}
