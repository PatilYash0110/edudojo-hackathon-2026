/** Which questions each technique asks, and how a battle draws them from its question pool. */
import type { AnswerType, BattleQuestion } from '@/teams/shared/contracts/battle';
import type { AttackTechnique, DefenseTechnique } from './battle-engine';

export interface TechniqueQuestions {
  count: number;
  answerType: AnswerType;
}

export const TECHNIQUE_QUESTIONS: Record<AttackTechnique | DefenseTechnique, TechniqueQuestions> = {
  heavy: { count: 1, answerType: 'typed' },
  combo: { count: 3, answerType: 'multiple-choice' },
  quiz: { count: 5, answerType: 'multiple-choice' },
  block: { count: 1, answerType: 'multiple-choice' },
  counter: { count: 2, answerType: 'multiple-choice' },
  dodge: { count: 1, answerType: 'typed' },
};

/**
 * Picks `count` distinct questions, preferring the requested answer type and the least-used
 * questions so repeats only happen once the pool is exhausted. Falls back to other answer types
 * when the pool has too few of the requested one. Ties keep pool order, so the caller's
 * shuffle decides variety. Never returns more questions than the pool holds.
 */
export function drawQuestions(
  pool: readonly BattleQuestion[],
  usage: ReadonlyMap<string, number>,
  { count, answerType }: TechniqueQuestions,
): BattleQuestion[] {
  const leastUsedFirst = (questions: readonly BattleQuestion[]) =>
    questions
      .map((question, index) => ({ question, index, used: usage.get(question.id) ?? 0 }))
      .sort((a, b) => a.used - b.used || a.index - b.index)
      .map(({ question }) => question);

  const preferred = leastUsedFirst(pool.filter((q) => q.answerType === answerType));
  const others = leastUsedFirst(pool.filter((q) => q.answerType !== answerType));
  return [...preferred, ...others].slice(0, count);
}
