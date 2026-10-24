/**
 * Server-sent events in OpenMAIC's chat format (`data: <json>\n\n`). Pure.
 * OWNER: BACKEND TEAM.
 */
import type { ChatStreamEvent } from '@/teams/shared/contracts/backend-api';

export interface SpokenMessage {
  agentId: string;
  agentName: string;
  content: string;
}

/** Collects finished agent messages from a stream of SSE text chunks. */
export function createSpokenMessageCollector() {
  let buffer = '';
  let current: SpokenMessage | null = null;
  return {
    push(chunk: string): SpokenMessage[] {
      buffer += chunk;
      const finished: SpokenMessage[] = [];
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (!line.startsWith('data: ')) continue;
        let event: ChatStreamEvent;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          continue;
        }
        if (event.type === 'agent_start') {
          current = { agentId: event.data.agentId, agentName: event.data.agentName, content: '' };
        } else if (event.type === 'text_delta' && current) {
          current.content += event.data.content;
        } else if (event.type === 'agent_end' && current) {
          if (current.content.trim()) finished.push(current);
          current = null;
        }
      }
      return finished;
    },
  };
}

/** A one-message reply in the same format, for scripted answers. */
export function scriptedStream(agent: { id: string; name: string }, content: string): Response {
  const messageId = `scripted-${Date.now()}`;
  const events: ChatStreamEvent[] = [
    { type: 'agent_start', data: { messageId, agentId: agent.id, agentName: agent.name } },
    { type: 'text_delta', data: { content, messageId } },
    { type: 'agent_end', data: { messageId, agentId: agent.id } },
    { type: 'done', data: { totalActions: 0, totalAgents: 1 } },
  ];
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
