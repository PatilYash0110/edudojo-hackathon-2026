import { afterEach, describe, expect, it, vi } from 'vitest';
import { BattleQuestionSchema } from '@/teams/shared/contracts/battle';
import { DojoSchema } from '@/teams/shared/contracts/dojo';
import { QUESTION_RULES } from '@/teams/game/balance/balance';
import { DEMO_DOJO } from '@/teams/game/content/demo-dojo';
import { DEMO_QUESTION_BANK } from '@/teams/game/content/demo-question-bank';
import { createDemoSource, DEMO_DOJO_ID } from './demo-source';

vi.mock('../api-client', () => ({ dojoFetch: vi.fn() }));
import { dojoFetch } from '../api-client';

afterEach(() => vi.clearAllMocks());

const source = createDemoSource({ random: () => 0 });

describe('demo DojoSource', () => {
  it('demo dojo matches the shared contract', () => {
    expect(DojoSchema.safeParse(DEMO_DOJO).success).toBe(true);
  });

  it('serves contract-valid questions without answer keys', async () => {
    const questions = await source.getQuestions({
      dojoId: DEMO_DOJO_ID,
      scope: { kind: 'boss' },
      count: DEMO_QUESTION_BANK.length,
    });
    expect(questions).toHaveLength(DEMO_QUESTION_BANK.length);
    for (const question of questions) {
      expect(BattleQuestionSchema.safeParse(question).success, question.id).toBe(true);
      for (const key of ['answer', 'acceptedAnswers', 'explanation']) {
        expect(Object.keys(question)).not.toContain(key);
      }
    }
  });

  it('serves the demo dojo and nothing else', async () => {
    expect((await source.getDojo(DEMO_DOJO_ID))?.title).toBe(DEMO_DOJO.title);
    expect(await source.getDojo('unknown')).toBeNull();
    expect(await source.createDojo({ topic: 'Anything' })).toEqual({ dojoId: DEMO_DOJO_ID });
  });

  it('returns a copy so screens cannot mutate the source', async () => {
    const dojo = await source.getDojo(DEMO_DOJO_ID);
    dojo!.floors[0].title = 'changed';
    expect((await source.getDojo(DEMO_DOJO_ID))!.floors[0].title).toBe(DEMO_DOJO.floors[0].title);
  });

  it('has multiple-choice and typed questions for every objective', () => {
    for (const objective of DEMO_DOJO.floors.flatMap((floor) => floor.objectives)) {
      const pool = DEMO_QUESTION_BANK.filter((q) => q.objectiveId === objective.id);
      expect(
        pool.some((q) => q.answerType === 'multiple-choice'),
        objective.id,
      ).toBe(true);
      expect(
        pool.some((q) => q.answerType === 'typed'),
        objective.id,
      ).toBe(true);
    }
    const ids = DEMO_QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('limits floor questions to that floor and boss questions to every objective', async () => {
    const floor = DEMO_DOJO.floors[1];
    const floorObjectives = new Set(floor.objectives.map((o) => o.id));
    const floorQuestions = await source.getQuestions({
      dojoId: DEMO_DOJO_ID,
      scope: { kind: 'floor', floorId: floor.id },
      count: 50,
    });
    expect(floorQuestions.length).toBeGreaterThan(0);
    expect(floorQuestions.every((q) => floorObjectives.has(q.objectiveId))).toBe(true);

    const bossQuestions = await source.getQuestions({
      dojoId: DEMO_DOJO_ID,
      scope: { kind: 'boss' },
      count: 50,
    });
    const allObjectives = DEMO_DOJO.floors.flatMap((f) => f.objectives.map((o) => o.id));
    expect(new Set(bossQuestions.map((q) => q.objectiveId))).toEqual(new Set(allObjectives));
  });

  it('filters by answer type, respects count, and prefers unseen questions', async () => {
    const scope = { kind: 'floor' as const, floorId: '1' };
    const typed = await source.getQuestions({
      dojoId: DEMO_DOJO_ID,
      scope,
      count: 5,
      answerType: 'typed',
    });
    expect(typed.length).toBeGreaterThan(0);
    expect(typed.every((q) => q.answerType === 'typed')).toBe(true);

    const first = await source.getQuestions({ dojoId: DEMO_DOJO_ID, scope, count: 2 });
    expect(first).toHaveLength(2);
    const next = await source.getQuestions({
      dojoId: DEMO_DOJO_ID,
      scope,
      count: 2,
      excludeIds: first.map((q) => q.id),
    });
    expect(next.some((q) => first.some((seen) => seen.id === q.id))).toBe(false);
  });

  it('grades every answer key as correct and reports mastery deltas', async () => {
    for (const question of DEMO_QUESTION_BANK.filter((q) => q.answerType === 'multiple-choice')) {
      const result = await source.grade({
        dojoId: DEMO_DOJO_ID,
        questionId: question.id,
        answer: question.answer,
      });
      expect(result.correct, question.id).toBe(true);
      expect(result.objectiveId).toBe(question.objectiveId);
      expect(result.masteryDelta).toBe(QUESTION_RULES.masteryDeltaCorrect);
    }
  });

  it.each([1, 0.5, 0])('uses server semantic grading for typed answers: %s', async (score) => {
    const result = {
      questionId: 'wo-build-typed',
      objectiveId: 'word-order',
      correct: score === 1,
      score,
      explanation: 'Feedback',
      masteryDelta: 0,
    };
    vi.mocked(dojoFetch).mockResolvedValueOnce({ result });
    expect(
      await source.grade({
        dojoId: DEMO_DOJO_ID,
        questionId: 'wo-build-typed',
        answer: 'my answer',
      }),
    ).toEqual(result);
    expect(dojoFetch).toHaveBeenCalledWith('/api/dojo/battle/answers', {
      method: 'POST',
      body: { dojoId: DEMO_DOJO_ID, questionId: 'wo-build-typed', answer: 'my answer' },
    });
  });

  it('propagates grading failures instead of assigning an incorrect result', async () => {
    vi.mocked(dojoFetch).mockRejectedValueOnce(new Error('Unavailable'));
    await expect(
      source.grade({ dojoId: DEMO_DOJO_ID, questionId: 'wo-build-typed', answer: 'answer' }),
    ).rejects.toThrow('Unavailable');
  });

  it('rejects unknown questions', async () => {
    await expect(
      source.grade({ dojoId: DEMO_DOJO_ID, questionId: 'missing', answer: 'x' }),
    ).rejects.toThrow('Unknown demo question');
  });
});
