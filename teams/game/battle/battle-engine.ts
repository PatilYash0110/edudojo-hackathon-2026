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

export function createBattleState(): BattleState {
  return {
    playerHp: BATTLE_BALANCE.playerHp,
    playerMaxHp: BATTLE_BALANCE.playerHp,
    enemyHp: BATTLE_BALANCE.enemyHp,
    enemyMaxHp: BATTLE_BALANCE.enemyHp,
    turn: 'player',
    round: 1,
    combo: 0,
    cooldowns: { heavy: 0, combo: 0, quiz: 0 },
    lastMessage: 'The bell rings. Choose your first technique.',
  };
}

function clampScore(correct: number, total: number): number {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max(Math.floor(correct), 0), Math.floor(total));
}

export function attackDamage(technique: AttackTechnique, correct: number, total: number): number {
  const score = clampScore(correct, total);

  if (technique === 'heavy') {
    return score === total ? BATTLE_BALANCE.heavyDamage : 0;
  }

  if (technique === 'combo') {
    return score * BATTLE_BALANCE.comboDamagePerHit;
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

  const success = clampScore(correct, total) === Math.max(1, Math.floor(total));
  let incomingDamage = BATTLE_BALANCE.enemyDamage;
  let counterDamage = 0;

  if (success && technique === 'block') {
    incomingDamage = Math.ceil(BATTLE_BALANCE.enemyDamage * BATTLE_BALANCE.blockDamageRatio);
  }
  if (success && technique === 'dodge') incomingDamage = 0;
  if (success && technique === 'counter') {
    incomingDamage = 0;
    counterDamage = BATTLE_BALANCE.counterDamage;
  }

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
      return createBattleState();
    case 'ATTACK_RESOLVED':
      return resolveAttack(state, event.technique, event.correct, event.total);
    case 'DEFENSE_RESOLVED':
      return resolveDefense(state, event.technique, event.correct, event.total);
    default:
      return state;
  }
}
