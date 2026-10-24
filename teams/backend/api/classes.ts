/**
 * Class management (teacher) and the class leaderboard.
 * Routes: app/api/dojo/classes/**. OWNER: BACKEND TEAM.
 */
import { randomInt, randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

import { CreateClassBody, type ClassSummary } from '@/teams/shared/contracts/backend-api';

import { leaderboard, studentRows } from '../analytics/dashboards';
import { requireUser, type DojoUser } from '../auth/session';
import { db } from '../data/db';
import { DojoError, handle, ok, readBody } from './http';

type Params = { params: Promise<{ classId: string }> };

interface ClassRow {
  id: string;
  name: string;
  pin: string;
  student_count: string;
  created_at: Date;
}

const toSummary = (row: ClassRow): ClassSummary => ({
  id: row.id,
  name: row.name,
  pin: row.pin,
  studentCount: Number(row.student_count),
  createdAt: row.created_at.toISOString(),
});

const SELECT_CLASS = `SELECT c.id, c.name, c.pin, c.created_at,
  (SELECT count(*) FROM dojo_users u WHERE u.class_id = c.id) AS student_count
  FROM dojo_classes c`;

/** Retry on the rare PIN collision. */
async function withFreshPin<T>(write: (pin: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(randomInt(0, 1_000_000).toString().padStart(6, '0'));
    } catch (error) {
      if ((error as { code?: string }).code !== '23505' || attempt >= 4) throw error;
    }
  }
}

async function ownedClass(teacher: DojoUser, classId: string): Promise<ClassRow> {
  const pool = await db();
  const { rows } = await pool.query<ClassRow>(
    `${SELECT_CLASS} WHERE c.id = $1 AND c.teacher_id = $2`,
    [classId, teacher.id],
  );
  if (!rows[0]) throw new DojoError('NOT_FOUND', 'Klasse nicht gefunden.');
  return rows[0];
}

export function listClasses(req: NextRequest) {
  return handle(async () => {
    const teacher = await requireUser(req, 'teacher');
    const pool = await db();
    const { rows } = await pool.query<ClassRow>(
      `${SELECT_CLASS} WHERE c.teacher_id = $1 ORDER BY c.created_at DESC`,
      [teacher.id],
    );
    return ok({ classes: rows.map(toSummary) });
  });
}

export function createClass(req: NextRequest) {
  return handle(async () => {
    const teacher = await requireUser(req, 'teacher');
    const { name } = await readBody(req, CreateClassBody);
    const pool = await db();
    const id = randomUUID();
    await withFreshPin((pin) =>
      pool.query('INSERT INTO dojo_classes (id, teacher_id, name, pin) VALUES ($1, $2, $3, $4)', [
        id,
        teacher.id,
        name,
        pin,
      ]),
    );
    return ok({ class: toSummary(await ownedClass(teacher, id)) }, 201);
  });
}

export function getClass(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const teacher = await requireUser(req, 'teacher');
    const { classId } = await params;
    const row = await ownedClass(teacher, classId);
    return ok({ class: { ...toSummary(row), students: await studentRows(classId) } });
  });
}

/** Deletes the class and, by cascade, its students and all their data. */
export function deleteClass(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const teacher = await requireUser(req, 'teacher');
    const { classId } = await params;
    await ownedClass(teacher, classId);
    await (await db()).query('DELETE FROM dojo_classes WHERE id = $1', [classId]);
    return ok();
  });
}

export function rotatePin(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const teacher = await requireUser(req, 'teacher');
    const { classId } = await params;
    await ownedClass(teacher, classId);
    const pool = await db();
    await withFreshPin((pin) =>
      pool.query('UPDATE dojo_classes SET pin = $2 WHERE id = $1', [classId, pin]),
    );
    return ok({ class: toSummary(await ownedClass(teacher, classId)) });
  });
}

export function getLeaderboard(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await requireUser(req);
    const { classId } = await params;
    return ok({ entries: await leaderboard(user, classId) });
  });
}
