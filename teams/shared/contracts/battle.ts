/**
 * Battle sessions, battle questions, grading, and rewards.
 *
 * OWNER: SHARED (all teams)
 * STATUS: questions and grading locked for Milestone 1. Additive changes only; tell every team.
 *
 * TODO: opponent, HP, timer, rounds, teacher preview
 */
import { z } from 'zod';

export type BattleKind = 'floor' | 'boss';
export type BattleOutcome = 'victory' | 'defeat' | 'abandoned';

export interface BattleSession {
  id: string;
  dojoId: string;
  floorId: string;
  kind: BattleKind;
}

export interface BattleRewards {
  outcome: BattleOutcome;
  xpGained: number;
}

export const AnswerTypeSchema = z.enum(['multiple-choice', 'typed']);
export type AnswerType = z.infer<typeof AnswerTypeSchema>;

/** Client-safe question: never carries the answer key. */
export const BattleQuestionSchema = z
  .object({
    id: z.string().min(1),
    objectiveId: z.string().min(1),
    prompt: z.string().min(1),
    answerType: AnswerTypeSchema,
    options: z.array(z.string().min(1)).optional(),
    difficulty: z.number().int().min(1).max(3),
    timeoutMs: z.number().int().positive(),
  })
  .refine((question) => question.answerType === 'typed' || (question.options?.length ?? 0) >= 2, {
    message: 'Multiple-choice questions need at least two options.',
    path: ['options'],
  });
export type BattleQuestion = z.infer<typeof BattleQuestionSchema>;

/** Floor battles draw from one floor's objectives; the boss draws from every objective. */
export const QuestionScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('floor'), floorId: z.string().min(1) }),
  z.object({ kind: z.literal('boss') }),
]);
export type QuestionScope = z.infer<typeof QuestionScopeSchema>;

export const QuestionRequestSchema = z.object({
  dojoId: z.string().min(1),
  scope: QuestionScopeSchema,
  count: z.number().int().positive(),
  answerType: AnswerTypeSchema.optional(),
  /** Question ids already served in this battle; avoided while the pool allows it. */
  excludeIds: z.array(z.string()).optional(),
});
export type QuestionRequest = z.infer<typeof QuestionRequestSchema>;

export const GradeRequestSchema = z.object({
  dojoId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.string(),
});
export type GradeRequest = z.infer<typeof GradeRequestSchema>;

/** Authoritative grading result. Game rules consume `correct`; mastery consumes `masteryDelta`. */
export const GradeResultSchema = z.object({
  questionId: z.string().min(1),
  objectiveId: z.string().min(1),
  correct: z.boolean(),
  /** 0..1 */
  score: z.number().min(0).max(1),
  explanation: z.string(),
  masteryDelta: z.number(),
});
export type GradeResult = z.infer<typeof GradeResultSchema>;
