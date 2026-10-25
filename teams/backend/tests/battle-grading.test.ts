import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attackDamage,
  battleReducer,
  createBattleState,
  BATTLE_BALANCE,
} from '@/teams/game/battle/battle-engine';
vi.mock('@/teams/backend/ai/llm', () => ({ askJson: vi.fn() }));
import { askJson } from '@/teams/backend/ai/llm';
import { gradeTypedAnswer } from '../assessment/battle-grading';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('typed battle answers', () => {
  it.each([undefined, 'false', '', '1'])(
    'uses answer-key matching without an LLM when flag is %s',
    async (value) => {
      vi.stubEnv('DOJO_GAME_LLM_GRADING_ENABLED', value);
      const question = {
        prompt: 'Complete the request.',
        answer: 'could',
        acceptedAnswers: ['could', 'can'],
        explanation: 'Use a polite request.',
      };
      expect(await gradeTypedAnswer(question, '  CAN?! ')).toEqual({
        score: 1,
        feedback: question.explanation,
      });
      expect((await gradeTypedAnswer(question, 'garbage')).score).toBe(0);
      expect(askJson).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['correct', 1],
    ['partial', 0.5],
    ['incorrect', 0],
  ] as const)('maps %s to %s', async (verdict, score) => {
    vi.stubEnv('DOJO_GAME_LLM_GRADING_ENABLED', 'true');
    vi.mocked(askJson).mockResolvedValueOnce({ verdict, feedback: 'Explanation' });
    expect(
      await gradeTypedAnswer(
        { prompt: 'Correct the verb.', answer: 'goes', explanation: 'Third person singular.' },
        'go',
      ),
    ).toEqual({ score, feedback: 'Explanation' });
    expect(vi.mocked(askJson).mock.calls.at(-1)?.[1]).toContain('EXCEPT when the question tests');
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'gives no effect for invalid question total %s',
    (total) => {
      expect(attackDamage('heavy', 0, total)).toBe(0);
      const state = { ...createBattleState(), turn: 'enemy' as const };
      const result = battleReducer(state, {
        type: 'DEFENSE_RESOLVED',
        technique: 'dodge',
        correct: 0,
        total,
      });
      expect(result.playerHp).toBe(state.playerHp - BATTLE_BALANCE.enemyDamage);
    },
  );
  it('gives half heavy attack damage', () => {
    expect(attackDamage('heavy', 0.5, 1)).toBe(BATTLE_BALANCE.heavyDamage / 2);
    const result = battleReducer(createBattleState(), {
      type: 'ATTACK_RESOLVED',
      technique: 'heavy',
      correct: 0.5,
      total: 1,
    });
    expect(result.enemyHp).toBe(BATTLE_BALANCE.enemyHp - BATTLE_BALANCE.heavyDamage / 2);
  });
  it.each(['block', 'counter', 'dodge'] as const)('halves the effect of %s', (technique) => {
    const state = { ...createBattleState(), turn: 'enemy' as const };
    const full = battleReducer(state, {
      type: 'DEFENSE_RESOLVED',
      technique,
      correct: 1,
      total: 1,
    });
    const partial = battleReducer(state, {
      type: 'DEFENSE_RESOLVED',
      technique,
      correct: 0.5,
      total: 1,
    });
    const fullPrevented = BATTLE_BALANCE.enemyDamage - (state.playerHp - full.playerHp);
    expect(partial.playerHp).toBe(
      state.playerHp - Math.round(BATTLE_BALANCE.enemyDamage - fullPrevented / 2),
    );
    expect(state.enemyHp - partial.enemyHp).toBe(Math.round((state.enemyHp - full.enemyHp) / 2));
  });
});
