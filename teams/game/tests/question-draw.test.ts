import { describe, expect, it } from 'vitest';
import type { BattleQuestion } from '@/teams/shared/contracts/battle';
import { drawQuestions, TECHNIQUE_QUESTIONS } from '../battle/question-draw';

const q = (id: string, answerType: BattleQuestion['answerType']): BattleQuestion => ({
  id,
  objectiveId: 'o',
  prompt: id,
  answerType,
  ...(answerType === 'multiple-choice' ? { options: ['a', 'b'] } : {}),
  difficulty: 1,
  timeoutMs: 9000,
});

const pool = [q('m1', 'multiple-choice'), q('t1', 'typed'), q('m2', 'multiple-choice')];

describe('drawQuestions', () => {
  it('keeps the question counts each technique has always used', () => {
    expect(TECHNIQUE_QUESTIONS.heavy).toEqual({ count: 1, answerType: 'typed' });
    expect(TECHNIQUE_QUESTIONS.combo.count).toBe(3);
    expect(TECHNIQUE_QUESTIONS.quiz.count).toBe(5);
    expect(TECHNIQUE_QUESTIONS.counter.count).toBe(2);
  });

  it('prefers the requested answer type and the least-used questions', () => {
    const usage = new Map([['m1', 2]]);
    expect(
      drawQuestions(pool, usage, { count: 2, answerType: 'multiple-choice' }).map((x) => x.id),
    ).toEqual(['m2', 'm1']);
    expect(drawQuestions(pool, usage, { count: 1, answerType: 'typed' }).map((x) => x.id)).toEqual([
      't1',
    ]);
  });

  it('fills from other answer types and never exceeds the pool', () => {
    expect(
      drawQuestions(pool, new Map(), { count: 5, answerType: 'typed' }).map((x) => x.id),
    ).toEqual(['t1', 'm1', 'm2']);
    expect(drawQuestions([], new Map(), { count: 3, answerType: 'typed' })).toEqual([]);
  });
});
