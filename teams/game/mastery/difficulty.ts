/**
 * Adaptive difficulty: what to serve next for one objective.
 *
 * OWNER: GAME TEAM. First version by the Backend Team; tune freely.
 */
export function nextDifficulty(mastery: number): 1 | 2 | 3 {
  if (mastery < 0.4) return 1;
  if (mastery < 0.75) return 2;
  return 3;
}
