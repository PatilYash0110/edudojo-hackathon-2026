/**
 * Student chat and leaderboard.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: author kind, timestamps, level, floors cleared
 */
export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  content: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  xp: number;
}
