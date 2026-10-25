/**
 * Typed fetch for /api/dojo/* (paths: teams/shared/contracts/api-routes.ts).
 *
 * OWNER: FRONTEND TEAM
 *
 * Every response is `{ success: true, ...data }` or `{ success: false, errorCode, error }`.
 * A solo player has no account: the first UNAUTHENTICATED reply signs them in as a guest
 * student once, then the request is retried.
 */
import { DOJO_API } from '@/teams/shared/contracts/api-routes';

export class DojoApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'DojoApiError';
  }
}

type Envelope = { success: boolean; errorCode?: string; error?: string } & Record<string, unknown>;

async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      credentials: 'same-origin',
      headers: init?.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new DojoApiError('NETWORK', 'The dojo server cannot be reached.', 0);
  }
  const payload = (await response.json().catch(() => null)) as Envelope | null;
  if (!response.ok || !payload?.success) {
    throw new DojoApiError(
      payload?.errorCode ?? 'INTERNAL_ERROR',
      payload?.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }
  return payload as T;
}

let guestSignIn: Promise<unknown> | null = null;

function signInAsGuest(): Promise<unknown> {
  // Parallel requests share one guest account.
  guestSignIn ??= request(DOJO_API.guest, { method: 'POST', body: {} }).finally(() => {
    guestSignIn = null;
  });
  return guestSignIn;
}

export async function dojoFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown; signIn?: boolean },
): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (!(error instanceof DojoApiError) || error.code !== 'UNAUTHENTICATED') throw error;
    if (init?.signIn === false) throw error;
    await signInAsGuest();
    return request<T>(path, init);
  }
}
