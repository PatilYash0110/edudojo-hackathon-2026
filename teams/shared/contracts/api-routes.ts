/**
 * Every /api/dojo path. Frontend calls them, Backend implements them (all 501 now).
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: request/response types per endpoint
 */
export const DOJO_API = {
  me: '/api/dojo/me',
  dojos: '/api/dojo/dojos',
  dojo: (dojoId: string) => `/api/dojo/dojos/${dojoId}`,
  startBattle: (dojoId: string) => `/api/dojo/dojos/${dojoId}/battles`,
  submitAnswer: (battleId: string) => `/api/dojo/battles/${battleId}/answers`,
  finishBattle: (battleId: string) => `/api/dojo/battles/${battleId}/finish`,
  agents: '/api/dojo/agents',
  chat: (roomId: string) => `/api/dojo/chat/${encodeURIComponent(roomId)}`,
  leaderboard: (dojoId: string) => `/api/dojo/leaderboard/${dojoId}`,
  studentAnalytics: '/api/dojo/analytics/student',
  teacherAnalytics: '/api/dojo/analytics/teacher',
} as const;
