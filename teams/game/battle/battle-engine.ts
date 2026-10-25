/** Pure battle rules shared by the browser prototype and the future backend. */

import { ATTACK_COOLDOWNS, BATTLE_BALANCE } from '../balance/balance';

export { ATTACK_COOLDOWNS, BATTLE_BALANCE } from '../balance/balance';

export type AttackTechnique = 'heavy' | 'combo' | 'quiz';
export type DefenseTechnique = 'block' | 'counter' | 'dodge';
export type BattleTurn = 'player' | 'enemy' | 'victory' | 'defeat';

export interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  turn: BattleTurn;
  round: number;
  combo: number;
  cooldowns: Record<AttackTechnique, number>;
  lastMessage: string;
}

export type BattleEvent =
  | { type: 'RESET' }
  | {
      type: 'ATTACK_RESOLVED';
      technique: AttackTechnique;
      correct: number;
      total: number;
    }
  | {
      type: 'DEFENSE_RESOLVED';
      technique: DefenseTechnique;
      correct: number;
      total: number;
    };

export interface BattleSetup {
  /** Guardian HP; a decay rematch passes the forgotten share. Defaults to the balance value. */
  enemyHp?: number;
}

export function createBattleState(setup: BattleSetup = {}): BattleState {
  const enemyHp = Math.max(1, Math.round(setup.enemyHp ?? BATTLE_BALANCE.enemyHp));
  return {
    playerHp: BATTLE_BALANCE.playerHp,
    playerMaxHp: BATTLE_BALANCE.playerHp,
    enemyHp,
    enemyMaxHp: enemyHp,
    turn: 'player',
    round: 1,
    combo: 0,
    cooldowns: { heavy: 0, combo: 0, quiz: 0 },
    lastMessage: 'The bell rings. Choose your first technique.',
  };
}

function clampScore(correct: number, total: number): number {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max(correct, 0), Math.floor(total));
}

export function attackDamage(technique: AttackTechnique, correct: number, total: number): number {
  const score = clampScore(correct, total);
  if (score === 0) return 0;

  if (technique === 'heavy') {
    return Math.round((BATTLE_BALANCE.heavyDamage * score) / Math.max(1, total));
  }

  if (technique === 'combo') {
    return Math.round(score * BATTLE_BALANCE.comboDamagePerHit);
  }

  if (score < 3) return 0;
  return BATTLE_BALANCE.quizBaseDamage + (score - 3) * BATTLE_BALANCE.quizBonusPerAnswer;
}

function resolveAttack(
  state: BattleState,
  technique: AttackTechnique,
  correct: number,
  total: number,
): BattleState {
  if (state.turn !== 'player') return state;
  if (state.cooldowns[technique] > 0) return state;

  const score = clampScore(correct, total);
  const damage = attackDamage(technique, score, total);
  const enemyHp = Math.max(0, state.enemyHp - damage);
  const backlash = technique === 'quiz' && score < 3 ? BATTLE_BALANCE.quizBacklashDamage : 0;
  const playerHp = Math.max(0, state.playerHp - backlash);
  const cooldowns: Record<AttackTechnique, number> = {
    heavy: Math.max(0, state.cooldowns.heavy - 1),
    combo: Math.max(0, state.cooldowns.combo - 1),
    quiz: Math.max(0, state.cooldowns.quiz - 1),
  };
  cooldowns[technique] = ATTACK_COOLDOWNS[technique];
  // Cooldowns only tick when another attack is used, so Blast → Heavy → Combo leaves all three
  // waiting with nothing left to tick them. Never lock the player out: shorten them all until
  // at least one technique is ready.
  const soonest = Math.min(cooldowns.heavy, cooldowns.combo, cooldowns.quiz);
  if (soonest > 0) {
    for (const key of Object.keys(cooldowns) as AttackTechnique[]) cooldowns[key] -= soonest;
  }
  const labels: Record<AttackTechnique, string> = {
    heavy: 'Heavy Strike',
    combo: 'Three-Hit Combo',
    quiz: 'Knowledge Blast',
  };

  return {
    ...state,
    playerHp,
    enemyHp,
    turn: playerHp === 0 ? 'defeat' : enemyHp === 0 ? 'victory' : 'enemy',
    combo: damage > 0 ? state.combo + 1 : 0,
    cooldowns,
    lastMessage:
      backlash > 0
        ? `The Knowledge Blast collapsed. You take ${backlash} backlash damage (${score}/${total} correct).`
        : damage > 0
          ? `${labels[technique]} deals ${damage} damage (${score}/${total} correct).`
          : `${labels[technique]} misses. Read the explanation and defend yourself.`,
  };
}

function resolveDefense(
  state: BattleState,
  technique: DefenseTechnique,
  correct: number,
  total: number,
): BattleState {
  if (state.turn !== 'enemy') return state;

  const score = clampScore(correct, total);
  const strength =
    score === Math.max(1, Math.floor(total))
      ? 1
      : Number.isInteger(score)
        ? 0
        : score / Math.max(1, Math.floor(total));
  const success = strength > 0;
  // `number`, not the `as const` literal 24: block, dodge and counter lower it.
  let incomingDamage: number = BATTLE_BALANCE.enemyDamage;
  let counterDamage = 0;

  if (success && technique === 'block') {
    incomingDamage = Math.ceil(BATTLE_BALANCE.enemyDamage * BATTLE_BALANCE.blockDamageRatio);
  }
  if (success && technique === 'dodge') incomingDamage = 0;
  if (success && technique === 'counter') {
    incomingDamage = 0;
    counterDamage = BATTLE_BALANCE.counterDamage;
  }

  incomingDamage = Math.round(
    BATTLE_BALANCE.enemyDamage - (BATTLE_BALANCE.enemyDamage - incomingDamage) * strength,
  );
  counterDamage = Math.round(counterDamage * strength);
  const playerHp = Math.max(0, state.playerHp - incomingDamage);
  const enemyHp = Math.max(0, state.enemyHp - counterDamage);
  const turn: BattleTurn = playerHp === 0 ? 'defeat' : enemyHp === 0 ? 'victory' : 'player';
  const labels: Record<DefenseTechnique, string> = {
    block: 'Block',
    counter: 'Parry & Counter',
    dodge: 'Dodge',
  };

  return {
    ...state,
    playerHp,
    enemyHp,
    turn,
    round: state.round + 1,
    combo: incomingDamage === 0 ? state.combo : 0,
    lastMessage: success
      ? counterDamage > 0
        ? `${labels[technique]} succeeds. You counter for ${counterDamage} damage.`
        : `${labels[technique]} succeeds. You take ${incomingDamage} damage.`
      : `${labels[technique]} fails. The enemy deals ${incomingDamage} damage.`,
  };
}

export function battleReducer(state: BattleState, event: BattleEvent): BattleState {
  switch (event.type) {
    case 'RESET':
      // A restart keeps the battle's setup (a rematch guardian stays at its reduced HP).
      return createBattleState({ enemyHp: state.enemyMaxHp });
    case 'ATTACK_RESOLVED':
      return resolveAttack(state, event.technique, event.correct, event.total);
    case 'DEFENSE_RESOLVED':
      return resolveDefense(state, event.technique, event.correct, event.total);
    default:
      return state;
  }
}
