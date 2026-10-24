/**
 * Street-Fighter-style quiz battle as a pure reducer (runs in browser and server).
 *
 * OWNER: GAME TEAM
 * STATUS: placeholder, not implemented.
 *
 * TODO: BattleState / BattleEvent
 * TODO: damage, combo, focus meter, KO
 * TODO: animation effects for the Frontend arena
 */
import { todo } from '@/teams/shared/todo';

export interface BattleState {
  playerHp: number;
  enemyHp: number;
}

export type BattleEvent = { type: 'START' };

export function battleReducer(state: BattleState, event: BattleEvent): BattleState {
  void state;
  void event;
  return todo('battleReducer');
}
