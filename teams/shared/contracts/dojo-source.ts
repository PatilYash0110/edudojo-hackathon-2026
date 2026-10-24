/**
 * The one data boundary every game screen talks to. Demo and live (HTTP) sources implement it,
 * so the flow keeps working whether or not the Backend is reachable.
 *
 * OWNER: SHARED (all teams)
 * STATUS: locked for Milestone 1. Additive changes only; tell every team.
 */
import type { CreateDojoInput, Dojo } from './dojo';
import type { BattleQuestion, GradeRequest, GradeResult, QuestionRequest } from './battle';

export type DojoSourceKind = 'demo' | 'live';

export interface DojoSource {
  readonly kind: DojoSourceKind;
  createDojo(input: CreateDojoInput): Promise<{ dojoId: string }>;
  /** Resolves `null` when the dojo does not exist. */
  getDojo(dojoId: string): Promise<Dojo | null>;
  /** May return fewer than `count` when the pool is small; never returns answer keys. */
  getQuestions(request: QuestionRequest): Promise<BattleQuestion[]>;
  grade(request: GradeRequest): Promise<GradeResult>;
}
