/**
 * Adaptive difficulty: what to serve next.
 *
 * OWNER: GAME TEAM
 * STATUS: placeholder, not implemented.
 *
 * TODO: from mastery + streak
 */
import { todo } from '@/teams/shared/todo';

export function nextDifficulty(mastery: number): 1 | 2 | 3 {
  void mastery;
  return todo('nextDifficulty');
}
