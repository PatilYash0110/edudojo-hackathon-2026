/**
 * Challenge kinds. Game designs them, Backend grades them, Frontend renders them.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: kind-specific fields
 * TODO: client-safe ChallengePrompt without answer keys
 */
export type ChallengeKind =
  | 'mcq'
  | 'multi'
  | 'short_answer'
  | 'code'
  | 'simulation'
  | 'project'
  | 'debate';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  objectiveIds: string[];
  prompt: string;
  // TODO: difficulty, hints, explanation, answer key / rubric / tests
}

export interface Answer {
  challengeId: string;
  // TODO: choice ids | text | code | simulation result
}
