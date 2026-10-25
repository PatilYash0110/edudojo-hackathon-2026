/**
 * Route helpers: one error type, one wrapper that turns it (and zod errors)
 * into the `{ success: false, errorCode, error }` envelope OpenMAIC uses.
 *
 * OWNER: BACKEND TEAM.
 */
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

import { createLogger } from '@/lib/logger';

const log = createLogger('Dojo API');

export type DojoErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'CONFLICT'
  | 'OFF_TOPIC'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

const STATUS: Record<DojoErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  CONFLICT: 409,
  OFF_TOPIC: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Throw anywhere in a handler; `handle` answers it. The message is shown to users (German). */
export class DojoError extends Error {
  constructor(
    readonly code: DojoErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function ok(data: Record<string, unknown> = {}, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function fail(code: DojoErrorCode, message: string): NextResponse {
  return NextResponse.json(
    { success: false, errorCode: code, error: message },
    { status: STATUS[code] },
  );
}

/** Run a handler and map thrown errors to the envelope. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DojoError) return fail(error.code, error.message);
    if (error instanceof ZodError) return fail('INVALID_REQUEST', 'Ungültige Eingabe.');
    log.error('Unhandled error:', error);
    return fail('INTERNAL_ERROR', 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
  }
}

/** Parse a JSON body with a contract schema (throws ZodError → 400). */
export async function readBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const raw = await req.json().catch(() => {
    throw new DojoError('INVALID_REQUEST', 'Ungültige Eingabe.');
  });
  return schema.parse(raw);
}

/** Every endpoint not built yet answers this. */
export function notImplemented(endpoint: string): NextResponse {
  return NextResponse.json(
    { success: false, errorCode: 'NOT_IMPLEMENTED', error: `${endpoint} is not implemented yet` },
    { status: 501 },
  );
}
