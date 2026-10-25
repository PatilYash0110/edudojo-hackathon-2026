import { describe, expect, it } from 'vitest';
import {
  BATTLE_BALANCE,
  attackDamage,
  battleReducer,
  createBattleState,
} from '../battle/battle-engine';

describe('battle engine', () => {
  it('turns knowledge checks into the intended attack damage', () => {
    expect(attackDamage('heavy', 1, 1)).toBe(BATTLE_BALANCE.heavyDamage);
    expect(attackDamage('heavy', 0, 1)).toBe(0);
    expect(attackDamage('combo', 1, 3)).toBe(BATTLE_BALANCE.comboDamagePerHit);
    expect(attackDamage('combo', 2, 3)).toBe(BATTLE_BALANCE.comboDamagePerHit * 2);
    expect(attackDamage('combo', 3, 3)).toBe(BATTLE_BALANCE.comboDamagePerHit * 3);
    expect(attackDamage('quiz', 2, 5)).toBe(0);
    expect(attackDamage('quiz', 5, 5)).toBe(
      BATTLE_BALANCE.quizBaseDamage + BATTLE_BALANCE.quizBonusPerAnswer * 2,
    );
  });

  it('never leaves every technique on cooldown (Blast → Heavy → Combo)', () => {
    const defend = { type: 'DEFENSE_RESOLVED', technique: 'block', correct: 1, total: 1 } as const;
    let state = createBattleState();
    for (const [technique, total] of [
      ['quiz', 5],
      ['heavy', 1],
      ['combo', 3],
    ] as const) {
      state = battleReducer(state, { type: 'ATTACK_RESOLVED', technique, correct: total, total });
      state = battleReducer(state, defend);
      const ready = Object.values(state.cooldowns).filter((turns) => turns === 0);
      expect(ready.length).toBeGreaterThan(0);
    }
    expect(state.turn).toBe('player');
  });

  it('moves from an attack to enemy defense without mutating the previous state', () => {
    const start = createBattleState();
    const next = battleReducer(start, {
      type: 'ATTACK_RESOLVED',
      technique: 'combo',
      correct: 2,
      total: 3,
    });

    expect(start.enemyHp).toBe(BATTLE_BALANCE.enemyHp);
    expect(next.enemyHp).toBe(BATTLE_BALANCE.enemyHp - BATTLE_BALANCE.comboDamagePerHit * 2);
    expect(next.turn).toBe('enemy');
    expect(next.cooldowns.combo).toBe(1);
  });

  it('locks a used technique until its cooldown reaches zero', () => {
    const afterHeavy = battleReducer(createBattleState(), {
      type: 'ATTACK_RESOLVED',
      technique: 'heavy',
      correct: 1,
      total: 1,
    });
    const nextPlayerTurn = { ...afterHeavy, turn: 'player' as const };
    const blockedReuse = battleReducer(nextPlayerTurn, {
      type: 'ATTACK_RESOLVED',
      technique: 'heavy',
      correct: 1,
      total: 1,
    });
    const afterCombo = battleReducer(nextPlayerTurn, {
      type: 'ATTACK_RESOLVED',
      technique: 'combo',
      correct: 1,
      total: 3,
    });

    expect(afterHeavy.cooldowns.heavy).toBe(2);
    expect(blockedReuse).toBe(nextPlayerTurn);
    expect(afterCombo.cooldowns.heavy).toBe(1);
  });

  it('damages the player when Quiz Technique fails to charge', () => {
    const result = battleReducer(createBattleState(), {
      type: 'ATTACK_RESOLVED',
      technique: 'quiz',
      correct: 2,
      total: 5,
    });

    expect(result.enemyHp).toBe(BATTLE_BALANCE.enemyHp);
    expect(result.playerHp).toBe(BATTLE_BALANCE.playerHp - BATTLE_BALANCE.quizBacklashDamage);
  });

  it('applies block, counter, and dodge outcomes', () => {
    const enemyTurn = { ...createBattleState(), turn: 'enemy' as const };
    const blocked = battleReducer(enemyTurn, {
      type: 'DEFENSE_RESOLVED',
      technique: 'block',
      correct: 1,
      total: 1,
    });
    const countered = battleReducer(enemyTurn, {
      type: 'DEFENSE_RESOLVED',
      technique: 'counter',
      correct: 2,
      total: 2,
    });
    const dodged = battleReducer(enemyTurn, {
      type: 'DEFENSE_RESOLVED',
      technique: 'dodge',
      correct: 1,
      total: 1,
    });

    expect(blocked.playerHp).toBe(
      BATTLE_BALANCE.playerHp - Math.ceil(BATTLE_BALANCE.enemyDamage * 0.2),
    );
    expect(countered.playerHp).toBe(BATTLE_BALANCE.playerHp);
    expect(countered.enemyHp).toBe(BATTLE_BALANCE.enemyHp - BATTLE_BALANCE.counterDamage);
    expect(dodged.playerHp).toBe(BATTLE_BALANCE.playerHp);
  });

  it('ends the battle when either fighter reaches zero hp', () => {
    const weakEnemy = { ...createBattleState(), enemyHp: 20 };
    const victory = battleReducer(weakEnemy, {
      type: 'ATTACK_RESOLVED',
      technique: 'heavy',
      correct: 1,
      total: 1,
    });
    const weakPlayer = { ...createBattleState(), playerHp: 10, turn: 'enemy' as const };
    const defeat = battleReducer(weakPlayer, {
      type: 'DEFENSE_RESOLVED',
      technique: 'dodge',
      correct: 0,
      total: 1,
    });

    expect(victory.turn).toBe('victory');
    expect(defeat.turn).toBe('defeat');
  });
});
