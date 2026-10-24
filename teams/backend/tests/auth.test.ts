import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/teams/backend/auth/password';
import { signToken, verifyToken } from '@/teams/backend/auth/token';

const secret = Buffer.from('test-secret');

describe('auth', () => {
  it('hashes and verifies passwords', async () => {
    const stored = await hashPassword('richtig123');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('richtig123', stored)).toBe(true);
    expect(await verifyPassword('falsch123', stored)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });

  it('accepts only untampered, unexpired session tokens', () => {
    const token = signToken({ uid: 's_1', role: 'student', exp: Date.now() + 60_000 }, secret);
    expect(verifyToken(token, secret)?.uid).toBe('s_1');
    expect(verifyToken(token, Buffer.from('other'))).toBeNull();
    const [body, sig] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ uid: 't_1', role: 'teacher', exp: Date.now() + 60_000 }),
    ).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`, secret)).toBeNull();
    expect(verifyToken(`${body}.${sig}.x`, secret)).toBeNull();
    const expired = signToken({ uid: 's_1', role: 'student', exp: Date.now() - 1 }, secret);
    expect(verifyToken(expired, secret)).toBeNull();
  });
});
