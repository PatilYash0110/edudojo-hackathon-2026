import { describe, expect, it } from 'vitest';

import { agentConfig, pickChatAgents } from '@/teams/backend/agents/personas';
import { createSpokenMessageCollector } from '@/teams/backend/agents/sse';
import { extractJson } from '@/teams/backend/ai/json';
import { sharesKeyword } from '@/teams/backend/guard/keywords';

describe('guard + agents', () => {
  it('finds topic words but ignores stopwords and short words', () => {
    expect(sharesKeyword('Was ist Photosynthese genau?', ['Photosynthese verstehen'])).toBe(true);
    expect(sharesKeyword('Wer gewinnt die Bundesliga?', ['Photosynthese verstehen'])).toBe(false);
    expect(sharesKeyword('und was ist das', ['und das ist was'])).toBe(false);
  });

  it('extracts JSON from model prose', () => {
    expect(extractJson('Sure!\n```json\n{"onTopic": true}\n```')).toEqual({ onTopic: true });
    expect(extractJson('no json here')).toBeUndefined();
  });

  it('picks three agents with distinct names and scopes their personas', () => {
    const agents = pickChatAgents();
    expect(agents.map((a) => a.role)).toEqual(['teacher', 'curious', 'corrector']);
    expect(new Set(agents.map((a) => a.name)).size).toBe(3);
    const config = agentConfig(agents[2], { title: 'Brüche', objectives: ['Brüche kürzen'] });
    expect(config.persona).toContain('Brüche');
    expect(config.persona).toContain('Never reveal');
    expect(config.allowedActions).toEqual([]);
  });

  it('collects finished agent messages across chunk boundaries', () => {
    const collector = createSpokenMessageCollector();
    const events = [
      { type: 'agent_start', data: { messageId: 'm1', agentId: 'dojo-teacher', agentName: 'Mia' } },
      { type: 'text_delta', data: { content: 'Hal' } },
      { type: 'text_delta', data: { content: 'lo!' } },
      { type: 'agent_end', data: { messageId: 'm1', agentId: 'dojo-teacher' } },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join('');
    expect(collector.push(events.slice(0, 50))).toEqual([]);
    expect(collector.push(events.slice(50))).toEqual([
      { agentId: 'dojo-teacher', agentName: 'Mia', content: 'Hallo!' },
    ]);
  });
});
