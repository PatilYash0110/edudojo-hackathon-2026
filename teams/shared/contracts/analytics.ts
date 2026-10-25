/**
 * Dashboard payloads (one field per chart).
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: strengths, weaknesses, topics to revisit, chart series
 */
export interface StudentDashboard {
  dojoId: string;
  userId: string;
}

export interface TeacherDashboard {
  dojoId: string;
}
