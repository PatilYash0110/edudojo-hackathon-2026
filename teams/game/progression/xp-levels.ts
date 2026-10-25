/**
 * XP and levels.
 *
 * OWNER: GAME TEAM. First version by the Backend Team; tune freely.
 */
export const XP_PER_CORRECT = 10;

export function xpForAnswer(correct: boolean): number {
  return correct ? XP_PER_CORRECT : 0;
}

/** Level 1 at 0 XP, 2 at 50, 3 at 200, 4 at 450, ... */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}
