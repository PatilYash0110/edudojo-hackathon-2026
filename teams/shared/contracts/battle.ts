/**
 * Battle sessions and rewards.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: opponent, HP, timer, rounds, teacher preview
 */
export type BattleKind = 'floor' | 'boss';
export type BattleOutcome = 'victory' | 'defeat' | 'abandoned';

export interface BattleSession {
  id: string;
  dojoId: string;
  floorId: string;
  kind: BattleKind;
}

export interface BattleRewards {
  outcome: BattleOutcome;
  xpGained: number;
}
