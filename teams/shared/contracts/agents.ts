/**
 * AI characters: Sensei, Rival, Classmate, Boss.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: source (ai/scripted), audio for voice mode
 */
export type AgentRole = 'sensei' | 'rival' | 'classmate' | 'boss';

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
}
