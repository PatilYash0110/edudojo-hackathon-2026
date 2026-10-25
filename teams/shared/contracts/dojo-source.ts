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

/** Live dojos are generated first (a few minutes); demo dojos are always ready. */
export type DojoGenerationStatus =
  | { status: 'ready' }
  | { status: 'generating'; progress: number }
  | { status: 'failed'; error: string }
  | { status: 'missing' };

/** One row of the learner's dojo list, enough to resume without loading the dojo. */
export interface DojoSummary {
  id: string;
  title: string;
  status: 'generating' | 'ready' | 'failed';
  /** 0–100 while generating. */
  progress: number;
  /** Floor ids in tower order (bottom first); empty until ready. */
  floorIds: string[];
  /**
   * The OpenMAIC run and course behind this dojo, so a screen holding one of
   * those ids can find its way back to the tower. `runId` is set from the
   * start; `stageId` only once the course exists. Both null on the demo dojo,
   * which no run ever built.
   */
  runId: string | null;
  stageId: string | null;
}

export interface DojoSource {
  readonly kind: DojoSourceKind;
  createDojo(input: CreateDojoInput): Promise<{ dojoId: string }>;
  /** The learner's dojos, newest first. Never signs anyone in just to list. */
  listDojos(): Promise<DojoSummary[]>;
  /** Resolves `null` until the dojo exists and is ready; `getStatus` says why. */
  getDojo(dojoId: string): Promise<Dojo | null>;
  getStatus(dojoId: string): Promise<DojoGenerationStatus>;
  /** May return fewer than `count` when the pool is small; never returns answer keys. */
  getQuestions(request: QuestionRequest): Promise<BattleQuestion[]>;
  grade(request: GradeRequest): Promise<GradeResult>;
}
