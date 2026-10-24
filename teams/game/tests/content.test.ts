import { describe, expect, it } from 'vitest';
import {
  ENGLISH_ATTACK_CHALLENGES,
  ENGLISH_DEFENSE_CHALLENGES,
  isPrototypeAnswerCorrect,
} from '../content/prototype-battle';

describe('English development question set', () => {
  it('matches each battle technique and grades every answer key as correct', () => {
    expect(Object.keys(ENGLISH_ATTACK_CHALLENGES)).toEqual(['heavy', 'combo', 'quiz']);
    expect(Object.keys(ENGLISH_DEFENSE_CHALLENGES)).toEqual(['block', 'counter', 'dodge']);
    expect(ENGLISH_ATTACK_CHALLENGES.heavy.questions).toHaveLength(1);
    expect(ENGLISH_ATTACK_CHALLENGES.combo.questions).toHaveLength(3);
    expect(ENGLISH_ATTACK_CHALLENGES.quiz.questions).toHaveLength(5);

    const questions = [
      ...Object.values(ENGLISH_ATTACK_CHALLENGES),
      ...Object.values(ENGLISH_DEFENSE_CHALLENGES),
    ].flatMap((challenge) => challenge.questions);

    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    for (const question of questions) {
      expect(isPrototypeAnswerCorrect(question, question.answer), question.id).toBe(true);
    }
  });
});
