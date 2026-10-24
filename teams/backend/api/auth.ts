/**
 * Kahoot-style login. Teachers: email + password. Students: class PIN + nickname.
 * Routes: app/api/dojo/auth/** and app/api/dojo/me.
 *
 * OWNER: BACKEND TEAM.
 */
import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

import { SlidingWindowFailureLimiter } from '@/lib/server/attempt-limiter';
import { clientIdentity } from '@/lib/server/client-identity';
import {
  StudentJoinBody,
  TeacherLoginBody,
  TeacherSignupBody,
} from '@/teams/shared/contracts/backend-api';

import { hashPassword, verifyPassword } from '../auth/password';
import {
  clearSessionCookie,
  currentUser,
  setSessionCookie,
  toMe,
  type DojoUser,
} from '../auth/session';
import { db } from '../data/db';
import { DojoError, handle, ok, readBody } from './http';

// shortcut: in-memory limits, per process; move to the DB when running several instances.
const loginLimiter = new SlidingWindowFailureLimiter({ maxFailures: 10 });
const joinLimiter = new SlidingWindowFailureLimiter({ maxFailures: 20 });

function limited(limiter: SlidingWindowFailureLimiter, key: string) {
  if (limiter.consume(key).limited) {
    throw new DojoError('RATE_LIMITED', 'Zu viele Versuche. Bitte warte eine Minute.');
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505';
}

export function signupTeacher(req: NextRequest) {
  return handle(async () => {
    const body = await readBody(req, TeacherSignupBody);
    const pool = await db();
    const user: DojoUser = {
      id: `t_${randomUUID()}`,
      role: 'teacher',
      displayName: body.displayName,
      classId: null,
      xp: 0,
    };
    try {
      await pool.query(
        `INSERT INTO dojo_users (id, role, display_name, email, password_hash) VALUES ($1, 'teacher', $2, $3, $4)`,
        [user.id, user.displayName, body.email, await hashPassword(body.password)],
      );
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DojoError('CONFLICT', 'Diese E-Mail ist schon registriert.');
      throw error;
    }
    return setSessionCookie(ok({ user: toMe(user) }, 201), user);
  });
}

export function loginTeacher(req: NextRequest) {
  return handle(async () => {
    const body = await readBody(req, TeacherLoginBody);
    limited(loginLimiter, body.email);
    const pool = await db();
    const { rows } = await pool.query<{
      id: string;
      display_name: string;
      password_hash: string;
      xp: number;
    }>(
      `SELECT id, display_name, password_hash, xp FROM dojo_users WHERE email = $1 AND role = 'teacher'`,
      [body.email],
    );
    const row = rows[0];
    if (!row || !(await verifyPassword(body.password, row.password_hash))) {
      throw new DojoError('UNAUTHENTICATED', 'E-Mail oder Passwort ist falsch.');
    }
    loginLimiter.recordSuccess(body.email);
    const user: DojoUser = {
      id: row.id,
      role: 'teacher',
      displayName: row.display_name,
      classId: null,
      xp: row.xp,
    };
    return setSessionCookie(ok({ user: toMe(user) }), user);
  });
}

export function joinClass(req: NextRequest) {
  return handle(async () => {
    const body = await readBody(req, StudentJoinBody);
    limited(joinLimiter, clientIdentity(req));
    const pool = await db();
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM dojo_classes WHERE pin = $1',
      [body.pin],
    );
    const classId = rows[0]?.id;
    if (!classId) throw new DojoError('NOT_FOUND', 'Diese PIN gibt es nicht.');
    const user: DojoUser = {
      id: `s_${randomUUID()}`,
      role: 'student',
      displayName: body.nickname,
      classId,
      xp: 0,
    };
    try {
      await pool.query(
        `INSERT INTO dojo_users (id, role, display_name, class_id) VALUES ($1, 'student', $2, $3)`,
        [user.id, user.displayName, classId],
      );
    } catch (error) {
      if (isUniqueViolation(error))
        throw new DojoError('CONFLICT', 'Dieser Name ist in der Klasse schon vergeben.');
      throw error;
    }
    joinLimiter.recordSuccess(clientIdentity(req));
    return setSessionCookie(ok({ user: toMe(user) }, 201), user);
  });
}

export function logout() {
  return handle(async () => clearSessionCookie(ok()));
}

export function getMe(req: NextRequest) {
  return handle(async () => {
    const user = await currentUser(req);
    return ok({ user: user ? toMe(user) : null });
  });
}
