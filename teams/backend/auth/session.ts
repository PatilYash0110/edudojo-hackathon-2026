/**
 * Who is calling: the `dojo_session` cookie → a row in dojo_users.
 * The cookie is signed with a key derived from OpenMAIC's instance secret
 * (`OPENMAIC_SECRET_KEY`, or data/instance-secret.key).
 *
 * OWNER: BACKEND TEAM.
 */
import { createHmac } from 'crypto';
import type { NextResponse } from 'next/server';

import { instanceKey } from '@/lib/server/secret-box';
import type { Me, UserRole } from '@/teams/shared/contracts/backend-api';
import { levelForXp } from '@/teams/game/progression/xp-levels';

import { DojoError } from '../api/http';
import { db } from '../data/db';
import { signToken, verifyToken } from './token';

export const SESSION_COOKIE = 'dojo_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface DojoUser {
  id: string;
  role: UserRole;
  displayName: string;
  classId: string | null;
  xp: number;
}

function sessionSecret(): Buffer {
  return createHmac('sha256', instanceKey().key).update('dojo-session-v1').digest();
}

export function setSessionCookie(
  res: NextResponse,
  user: Pick<DojoUser, 'id' | 'role'>,
): NextResponse {
  const token = signToken(
    { uid: user.id, role: user.role, exp: Date.now() + MAX_AGE_SECONDS * 1000 },
    sessionSecret(),
  );
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}

/** The signed-in user, or null (no cookie, bad signature, or user deleted with their class). */
export async function currentUser(req: Request): Promise<DojoUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  const claims = token ? verifyToken(token, sessionSecret()) : null;
  if (!claims) return null;
  const pool = await db();
  const { rows } = await pool.query<{
    id: string;
    role: UserRole;
    display_name: string;
    class_id: string | null;
    xp: number;
  }>('SELECT id, role, display_name, class_id, xp FROM dojo_users WHERE id = $1', [claims.uid]);
  const row = rows[0];
  if (!row || row.role !== claims.role) return null;
  return {
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    classId: row.class_id,
    xp: row.xp,
  };
}

export async function requireUser(req: Request, role?: UserRole): Promise<DojoUser> {
  const user = await currentUser(req);
  if (!user) throw new DojoError('UNAUTHENTICATED', 'Bitte melde dich an.');
  if (role && user.role !== role) {
    throw new DojoError(
      'FORBIDDEN',
      role === 'teacher' ? 'Nur für Lehrkräfte.' : 'Nur für Schüler:innen.',
    );
  }
  return user;
}

export function toMe(user: DojoUser): Me {
  return { ...user, level: levelForXp(user.xp) };
}
