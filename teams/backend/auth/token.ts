/**
 * Signed session token: `<base64url payload>.<base64url HMAC-SHA256>`.
 * Pure (the secret is passed in) so it is testable without the server.
 * OWNER: BACKEND TEAM.
 */
import { createHmac, timingSafeEqual } from 'crypto';

import type { UserRole } from '@/teams/shared/contracts/backend-api';

export interface SessionClaims {
  uid: string;
  role: UserRole;
  /** Expiry, ms since epoch. */
  exp: number;
}

function mac(body: string, secret: Buffer): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signToken(claims: SessionClaims, secret: Buffer): string {
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${body}.${mac(body, secret)}`;
}

export function verifyToken(token: string, secret: Buffer, now = Date.now()): SessionClaims | null {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(mac(body, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionClaims;
    if (typeof claims.uid !== 'string' || typeof claims.exp !== 'number' || claims.exp < now)
      return null;
    if (claims.role !== 'teacher' && claims.role !== 'student') return null;
    return claims;
  } catch {
    return null;
  }
}
