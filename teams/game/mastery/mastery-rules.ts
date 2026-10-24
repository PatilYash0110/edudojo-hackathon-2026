/**
 * Mastery rule per learning objective (the Backend stores the result).
 *
 * OWNER: GAME TEAM. First version written by the Backend Team (agreed in the
 * backend design) so quizzes work on day 1 — tune freely, keep the signatures.
 */
import type { MasteryStatus } from '@/teams/shared/contracts/backend-api';

/** How fast mastery follows new answers (moving average weight). */
export const MASTERY_ALPHA = 0.35;
export const MASTERED_AT = 0.8;
export const NEEDS_REVIEW_BELOW = 0.5;

/** New mastery (0..1) after an answer scored 0..1. */
export function updateMastery(previous: number, score: number): number {
  const next = previous + MASTERY_ALPHA * (score - previous);
  return Math.min(1, Math.max(0, Math.round(next * 1000) / 1000));
}

export function masteryStatus(mastery: number, attempts: number): MasteryStatus {
  if (attempts === 0) return 'new';
  if (mastery >= MASTERED_AT) return 'mastered';
  if (mastery < NEEDS_REVIEW_BELOW && attempts >= 2) return 'needs_review';
  return 'learning';
}
