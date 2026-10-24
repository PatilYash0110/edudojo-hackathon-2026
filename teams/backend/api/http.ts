/**
 * Route helpers.
 *
 * OWNER: BACKEND TEAM
 * STATUS: placeholder, not implemented.
 *
 * TODO: envelope like OpenMAIC lib/server/api-response.ts
 */
import { NextResponse } from 'next/server';

export function notImplemented(endpoint: string): NextResponse {
  return NextResponse.json(
    { success: false, errorCode: 'NOT_IMPLEMENTED', error: `${endpoint} is not implemented yet` },
    { status: 501 },
  );
}
