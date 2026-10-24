/**
 * In-memory store so nobody needs a DB on day 1.
 *
 * OWNER: BACKEND TEAM
 * STATUS: placeholder, not implemented.
 *
 * TODO: seed from teams/game/content/demo-dojo.ts
 */
import { todo } from '@/teams/shared/todo';

export async function createMemoryRepository(): Promise<unknown> {
  return todo('createMemoryRepository');
}
