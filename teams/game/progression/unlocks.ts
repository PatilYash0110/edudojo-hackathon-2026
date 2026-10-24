/** Dojo progression rules owned by Game Team. */

export type DojoStage = 'lesson' | 'battle' | 'boss' | 'complete';
export type DojoProgressEvent = 'LESSON_COMPLETED' | 'BATTLE_WON' | 'BOSS_DEFEATED';

export interface DojoProgress {
  floorCount: number;
  currentFloor: number;
  stage: DojoStage;
}

export function createDojoProgress(floorCount: number): DojoProgress {
  if (!Number.isInteger(floorCount) || floorCount < 1) {
    throw new Error('A dojo needs at least one learning floor.');
  }

  return { floorCount, currentFloor: 1, stage: 'lesson' };
}

/**
 * Each normal floor alternates lesson -> battle. Winning returns the learner
 * to the dojo for the next lesson. The Sensei boss unlocks after all floors.
 */
export function advanceDojoProgress(
  progress: DojoProgress,
  event: DojoProgressEvent,
): DojoProgress {
  if (progress.stage === 'lesson' && event === 'LESSON_COMPLETED') {
    return { ...progress, stage: 'battle' };
  }

  if (progress.stage === 'battle' && event === 'BATTLE_WON') {
    if (progress.currentFloor === progress.floorCount) {
      return { ...progress, stage: 'boss' };
    }

    return { ...progress, currentFloor: progress.currentFloor + 1, stage: 'lesson' };
  }

  if (progress.stage === 'boss' && event === 'BOSS_DEFEATED') {
    return { ...progress, stage: 'complete' };
  }

  return progress;
}

export function isFloorUnlocked(floor: number, progress: DojoProgress): boolean {
  return Number.isInteger(floor) && floor >= 1 && floor <= progress.currentFloor;
}

export function isFinalBossUnlocked(progress: DojoProgress): boolean {
  return progress.stage === 'boss' || progress.stage === 'complete';
}
