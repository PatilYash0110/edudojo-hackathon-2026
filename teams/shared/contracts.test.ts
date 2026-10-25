import { describe, expect, it } from 'vitest';
import { BattleQuestionSchema, GradeResultSchema } from './contracts/battle';
import { DojoSchema } from './contracts/dojo';
import { LessonCompletedEventSchema } from './contracts/lesson';

const floor = (order: number, objectiveId: string) => ({
  id: String(order),
  order,
  title: `Floor ${order}`,
  objectives: [{ id: objectiveId, title: objectiveId }],
  challenges: [],
});

const dojo = {
  id: 'd',
  title: 'Dojo',
  topic: 'Topic',
  floors: [floor(1, 'a'), floor(2, 'b')],
  boss: { id: 'boss', name: 'Boss' },
};

describe('shared contracts', () => {
  it('accepts a well-formed dojo', () => {
    expect(DojoSchema.safeParse(dojo).success).toBe(true);
  });

  it('rejects floors out of order and duplicate objective ids', () => {
    expect(DojoSchema.safeParse({ ...dojo, floors: [floor(2, 'b'), floor(1, 'a')] }).success).toBe(
      false,
    );
    expect(DojoSchema.safeParse({ ...dojo, floors: [floor(1, 'a'), floor(2, 'a')] }).success).toBe(
      false,
    );
  });

  it('multiple-choice questions require options; typed questions do not', () => {
    const base = { id: 'q', objectiveId: 'o', prompt: 'p', difficulty: 1, timeoutMs: 9000 };
    expect(BattleQuestionSchema.safeParse({ ...base, answerType: 'multiple-choice' }).success).toBe(
      false,
    );
    expect(BattleQuestionSchema.safeParse({ ...base, answerType: 'typed' }).success).toBe(true);
  });

  it('parses grade results and lesson completion events', () => {
    expect(
      GradeResultSchema.safeParse({
        questionId: 'q',
        objectiveId: 'o',
        correct: true,
        score: 1,
        explanation: '',
        masteryDelta: 0.1,
      }).success,
    ).toBe(true);
    expect(
      LessonCompletedEventSchema.safeParse({
        type: 'LESSON_COMPLETED',
        dojoId: 'demo',
        floorId: '1',
        completedObjectiveIds: ['a'],
      }).success,
    ).toBe(true);
  });
});
