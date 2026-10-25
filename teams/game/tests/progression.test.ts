import { describe, expect, it } from 'vitest';
import { bossPhaseFor, FINAL_BOSS } from '../boss/boss-phases';
import {
  advanceDojoProgress,
  createDojoProgress,
  isFinalBossUnlocked,
  isFloorUnlocked,
} from '../progression/unlocks';

describe('progression and mastery', () => {
  it.todo('XP curve');

  it('alternates dojo lessons and floor battles before unlocking the Sensei boss', () => {
    const floorOneLesson = createDojoProgress(2);
    const floorOneBattle = advanceDojoProgress(floorOneLesson, 'LESSON_COMPLETED');
    const floorTwoLesson = advanceDojoProgress(floorOneBattle, 'BATTLE_WON');
    const floorTwoBattle = advanceDojoProgress(floorTwoLesson, 'LESSON_COMPLETED');
    const boss = advanceDojoProgress(floorTwoBattle, 'BATTLE_WON');

    expect(floorOneBattle).toMatchObject({ currentFloor: 1, stage: 'battle' });
    expect(floorTwoLesson).toMatchObject({ currentFloor: 2, stage: 'lesson' });
    expect(isFloorUnlocked(2, floorTwoLesson)).toBe(true);
    expect(boss.stage).toBe('boss');
    expect(isFinalBossUnlocked(boss)).toBe(true);
  });

  it('uses every input objective in the final Sensei phase', () => {
    expect(bossPhaseFor(0.9).id).toBe(1);
    expect(bossPhaseFor(0.5).id).toBe(2);
    expect(bossPhaseFor(0.2).challengeScope).toBe('all-input-synthesis');
    expect(FINAL_BOSS.questionSource).toBe('all-objectives-from-user-input');
  });

  it.todo('mastery update');
  it.todo('adaptive difficulty');
});
