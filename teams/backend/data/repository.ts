/**
 * Storage interface; services depend on this only.
 *
 * OWNER: BACKEND TEAM
 * STATUS: placeholder, not implemented.
 *
 * TODO: battles, attempts, chat, leaderboard
 */
import type { Dojo } from '@/teams/shared/contracts/dojo';

export interface DojoRepository {
  getDojo(id: string): Promise<Dojo | null>;
  saveDojo(dojo: Dojo): Promise<void>;
}
