/**
 * Student and teacher dashboards, class progress rows and the leaderboard.
 * OWNER: BACKEND TEAM.
 */
import { MASTERED_AT, NEEDS_REVIEW_BELOW } from '@/teams/game/mastery/mastery-rules';
import { levelForXp } from '@/teams/game/progression/xp-levels';
import type {
  DailyPoint,
  LeaderboardEntry,
  StudentDashboard,
  StudentProgressRow,
  TeacherDashboard,
} from '@/teams/shared/contracts/backend-api';

import { DojoError } from '../api/http';
import type { DojoUser } from '../auth/session';
import { db } from '../data/db';
import { toClassroom, type ClassroomRow } from '../generation/classroom';
import {
  objectiveInsights,
  revisitSuggestions,
  strengthsAndWeaknesses,
  type MasteryRow,
} from './compute';

/** Accuracy per day over the last 14 days, for one student (userId) or a whole classroom. */
async function daily(classroomId: string, userId: string | null): Promise<DailyPoint[]> {
  const pool = await db();
  const { rows } = await pool.query<{ date: string; answers: string; accuracy: string }>(
    `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date, count(*) AS answers, avg(correct::int) AS accuracy
     FROM dojo_answers WHERE classroom_id = $1 AND ($2::text IS NULL OR user_id = $2)
       AND created_at > now() - interval '14 days'
     GROUP BY 1 ORDER BY 1`,
    [classroomId, userId],
  );
  return rows.map((row) => ({
    date: row.date,
    answers: Number(row.answers),
    accuracy: Number(row.accuracy),
  }));
}

/** Progress per student of a class, optionally limited to one classroom. */
export async function studentRows(
  classId: string,
  classroomId: string | null = null,
): Promise<StudentProgressRow[]> {
  const pool = await db();
  const { rows } = await pool.query<{
    id: string;
    display_name: string;
    xp: number;
    answers: string;
    accuracy: string | null;
    mastered: string;
    last_active: Date | null;
  }>(
    `SELECT u.id, u.display_name, u.xp,
       count(a.id) AS answers, avg(a.correct::int) AS accuracy, max(a.created_at) AS last_active,
       (SELECT count(*) FROM dojo_mastery m WHERE m.user_id = u.id AND m.mastery >= $3
          AND ($2::text IS NULL OR m.classroom_id = $2)) AS mastered
     FROM dojo_users u
     LEFT JOIN dojo_answers a ON a.user_id = u.id AND ($2::text IS NULL OR a.classroom_id = $2)
     WHERE u.class_id = $1 AND u.role = 'student'
     GROUP BY u.id ORDER BY u.xp DESC, u.display_name`,
    [classId, classroomId, MASTERED_AT],
  );
  return rows.map((row) => ({
    id: row.id,
    nickname: row.display_name,
    xp: row.xp,
    level: levelForXp(row.xp),
    accuracy: Number(row.accuracy ?? 0),
    answers: Number(row.answers),
    objectivesMastered: Number(row.mastered),
    lastActiveAt: row.last_active?.toISOString() ?? null,
  }));
}

export async function leaderboard(user: DojoUser, classId: string): Promise<LeaderboardEntry[]> {
  const pool = await db();
  const allowed =
    user.classId === classId ||
    (
      await pool.query('SELECT 1 FROM dojo_classes WHERE id = $1 AND teacher_id = $2', [
        classId,
        user.id,
      ])
    ).rowCount;
  if (!allowed) throw new DojoError('NOT_FOUND', 'Klasse nicht gefunden.');
  const { rows } = await pool.query<{ id: string; display_name: string; xp: number }>(
    `SELECT id, display_name, xp FROM dojo_users WHERE class_id = $1 AND role = 'student'
     ORDER BY xp DESC, created_at LIMIT 50`,
    [classId],
  );
  return rows.map((row, i) => ({
    rank: i + 1,
    userId: row.id,
    nickname: row.display_name,
    xp: row.xp,
    level: levelForXp(row.xp),
  }));
}

export async function studentDashboard(
  user: DojoUser,
  classroom: ClassroomRow,
): Promise<StudentDashboard> {
  const pool = await db();
  const mastery = (
    await pool.query<MasteryRow>(
      'SELECT objective_id, mastery, attempts FROM dojo_mastery WHERE user_id = $1 AND classroom_id = $2',
      [user.id, classroom.id],
    )
  ).rows;
  const totals = (
    await pool.query<{ answers: string; accuracy: string | null }>(
      'SELECT count(*) AS answers, avg(correct::int) AS accuracy FROM dojo_answers WHERE user_id = $1 AND classroom_id = $2',
      [user.id, classroom.id],
    )
  ).rows[0];
  const insights = objectiveInsights(classroom.floors, mastery);
  const { strengths, weaknesses } = strengthsAndWeaknesses(insights);
  return {
    classroomId: classroom.id,
    title: classroom.title,
    overall: {
      accuracy: Number(totals.accuracy ?? 0),
      answers: Number(totals.answers),
      objectivesMastered: insights.filter((i) => i.status === 'mastered').length,
      objectivesTotal: insights.length,
      xp: user.xp,
      level: levelForXp(user.xp),
    },
    mastery: insights,
    daily: await daily(classroom.id, user.id),
    strengths,
    weaknesses,
    revisit: revisitSuggestions(weaknesses, toClassroom(classroom).playerUrl),
  };
}

export async function teacherDashboard(
  user: DojoUser,
  classroom: ClassroomRow,
): Promise<TeacherDashboard> {
  if (classroom.creator_id !== user.id || !classroom.class_id) {
    throw new DojoError('FORBIDDEN', 'Nur für Klassenzimmer deiner Klassen.');
  }
  const pool = await db();
  const students = await studentRows(classroom.class_id, classroom.id);
  const mastery = (
    await pool.query<MasteryRow>(
      'SELECT objective_id, mastery, attempts FROM dojo_mastery WHERE classroom_id = $1',
      [classroom.id],
    )
  ).rows;
  const objectives = classroom.floors.flatMap((floor) =>
    floor.objectives.map((objective) => {
      const rows = mastery.filter((row) => row.objective_id === objective.id);
      const sum = rows.reduce((total, row) => total + row.mastery, 0);
      return {
        objectiveId: objective.id,
        title: objective.title,
        floorId: floor.id,
        floorTitle: floor.title,
        // Students who never answered count as 0.
        averageMastery: students.length ? sum / students.length : 0,
        struggling: rows.filter((row) => row.attempts > 0 && row.mastery < NEEDS_REVIEW_BELOW)
          .length,
      };
    }),
  );
  const hardest = (
    await pool.query<{ prompt: string; attempts: string; rate: string }>(
      `SELECT prompt, count(*) AS attempts, avg(correct::int) AS rate FROM dojo_answers
       WHERE classroom_id = $1 GROUP BY prompt ORDER BY rate ASC, attempts DESC LIMIT 5`,
      [classroom.id],
    )
  ).rows;
  const answered = students.filter((s) => s.answers > 0);
  return {
    classroomId: classroom.id,
    title: classroom.title,
    students: students.length,
    averageMastery: objectives.length
      ? objectives.reduce((total, o) => total + o.averageMastery, 0) / objectives.length
      : 0,
    averageAccuracy: answered.length
      ? answered.reduce((total, s) => total + s.accuracy, 0) / answered.length
      : 0,
    objectives,
    studentRows: students,
    hardestQuestions: hardest.map((row) => ({
      prompt: row.prompt,
      attempts: Number(row.attempts),
      correctRate: Number(row.rate),
    })),
    daily: await daily(classroom.id, null),
    revisit: revisitSuggestions(
      objectives.filter((o) => o.struggling > 0 && o.averageMastery < NEEDS_REVIEW_BELOW),
      toClassroom(classroom).playerUrl,
    ),
  };
}
