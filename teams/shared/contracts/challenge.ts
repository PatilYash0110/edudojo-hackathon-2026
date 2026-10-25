/**
 * Challenge kinds. Game designs them, Backend grades them, Frontend renders them.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented. Battle questions use `BattleQuestion` in ./battle.
 *
 * TODO: kind-specific fields
 * TODO: client-safe ChallengePrompt without answer keys
 */
import { z } from 'zod';

export const ChallengeKindSchema = z.enum([
  'mcq',
  'multi',
  'short_answer',
  'code',
  'simulation',
  'project',
  'debate',
]);
export type ChallengeKind = z.infer<typeof ChallengeKindSchema>;

export const ChallengeSchema = z.object({
  id: z.string().min(1),
  kind: ChallengeKindSchema,
  objectiveIds: z.array(z.string().min(1)),
  prompt: z.string().min(1),
  // TODO: difficulty, hints, explanation, answer key / rubric / tests
});
export type Challenge = z.infer<typeof ChallengeSchema>;

export interface Answer {
  challengeId: string;
  // TODO: choice ids | text | code | simulation result
}
