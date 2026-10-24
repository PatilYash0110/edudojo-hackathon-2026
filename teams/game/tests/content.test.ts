import { describe, expect, it } from 'vitest';
import { TECHNIQUE_QUESTIONS } from '../battle/question-draw';
import { DEMO_DOJO } from '../content/demo-dojo';
import { DEMO_QUESTION_BANK, isDemoAnswerCorrect } from '../content/demo-question-bank';

describe('demo question bank', () => {
  it('has unique ids and grades every answer key as correct', () => {
    const ids = DEMO_QUESTION_BANK.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const question of DEMO_QUESTION_BANK) {
      expect(isDemoAnswerCorrect(question, question.answer), question.id).toBe(true);
      if (question.answerType === 'multiple-choice') {
        expect(question.options, question.id).toContain(question.answer);
      }
    }
  });

  it('only uses objectives that exist in the demo dojo', () => {
    const objectives = new Set(
      DEMO_DOJO.floors.flatMap((floor) => floor.objectives.map((o) => o.id)),
    );
    for (const question of DEMO_QUESTION_BANK) {
      expect(objectives.has(question.objectiveId), question.id).toBe(true);
    }
  });

  it('gives every floor enough questions for its largest technique', () => {
    const largest = Math.max(...Object.values(TECHNIQUE_QUESTIONS).map((rule) => rule.count));
    for (const floor of DEMO_DOJO.floors) {
      const objectives = new Set(floor.objectives.map((o) => o.id));
      const pool = DEMO_QUESTION_BANK.filter((question) => objectives.has(question.objectiveId));
      expect(pool.length, floor.title).toBeGreaterThanOrEqual(largest);
      expect(
        pool.some((question) => question.answerType === 'typed'),
        floor.title,
      ).toBe(true);
    }
  });
});
