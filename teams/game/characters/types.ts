/**
 * Persona shape shared by the four characters.
 *
 * OWNER: GAME TEAM
 * STATUS: placeholder, not implemented.
 *
 * TODO: speaking style, prompt fragment, avatar, voice
 */
import type { AgentRole } from '@/teams/shared/contracts/agents';

export interface CharacterPersona {
  role: AgentRole;
  name: string;
  personality: string;
}
