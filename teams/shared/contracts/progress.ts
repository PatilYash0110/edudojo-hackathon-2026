/**
 * Users, profiles, mastery, attempts, grades.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: timestamps, health, skills, achievements
 */
export type UserRole = 'student' | 'teacher';

export interface User {
  id: string;
  displayName: string;
  role: UserRole;
}

export interface PlayerProfile {
  userId: string;
  xp: number;
  level: number;
}

export type MasteryStatus = 'new' | 'learning' | 'mastered' | 'needs_review';

export interface MasteryRecord {
  userId: string;
  dojoId: string;
  objectiveId: string;
  mastery: number;
  status: MasteryStatus;
}

/** @deprecated Battle grading uses `GradeResult` from ./battle. Kept until Backend migrates. */
export interface GradeResult {
  correct: boolean;
  score: number;
  feedback: string;
}
