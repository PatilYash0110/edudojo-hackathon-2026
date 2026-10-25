/**
 * Chat with the classroom's three agents. Reuses DojoLearn's multi-agent
 * director (`POST /api/chat/pi`): we build its request from the generated
 * course + our agents, stream its events through, and save each finished
 * message. Off-topic messages get a scripted redirect instead.
 *
 * OWNER: BACKEND TEAM.
 */
import { NextRequest } from 'next/server';

import { POST as directorChat } from '@/app/api/chat/pi/route';
import { getOwnerScopedDocumentStore } from '@/lib/server/agent-runtime/owner-scoped-documents';
import { createLogger } from '@/lib/logger';
import type { StatelessChatRequest } from '@/lib/types/chat';
import type { ChatMessage } from '@/teams/shared/contracts/backend-api';

import { DojoError } from '../api/http';
import type { DojoUser } from '../auth/session';
import { db } from '../data/db';
import type { ClassroomRow } from '../generation/classroom';
import { OFF_TOPIC_REPLY, consumeQuota, isOnTopic } from '../guard/guard';
import { agentConfig } from './personas';
import { createSpokenMessageCollector, scriptedStream } from './sse';

const log = createLogger('Dojo Chat');
const HISTORY_FOR_AGENTS = 20;

interface MessageRow {
  id: string;
  speaker: string;
  speaker_name: string;
  content: string;
  created_at: Date;
}

async function saveMessage(
  classroomId: string,
  userId: string,
  speaker: string,
  name: string,
  content: string,
) {
  const pool = await db();
  await pool.query(
    `INSERT INTO dojo_chat_messages (classroom_id, user_id, speaker, speaker_name, content) VALUES ($1, $2, $3, $4, $5)`,
    [classroomId, userId, speaker, name, content],
  );
}

export async function chatHistory(
  classroomId: string,
  userId: string,
  limit = 100,
): Promise<ChatMessage[]> {
  const pool = await db();
  const { rows } = await pool.query<MessageRow>(
    `SELECT * FROM (SELECT id, speaker, speaker_name, content, created_at FROM dojo_chat_messages
       WHERE classroom_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT $3) recent ORDER BY id`,
    [classroomId, userId, limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    speaker: row.speaker,
    speakerName: row.speaker_name,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function chat(
  req: Request,
  user: DojoUser,
  classroom: ClassroomRow,
  message: string,
): Promise<Response> {
  if (classroom.status !== 'ready' || !classroom.stage_id) {
    throw new DojoError('CONFLICT', 'Das Klassenzimmer wird noch erstellt.');
  }
  await consumeQuota(user, 'chat');
  const scope = {
    title: classroom.title,
    objectives: classroom.floors.flatMap((floor) => floor.objectives.map((o) => o.title)),
  };
  const history = await chatHistory(classroom.id, user.id, HISTORY_FOR_AGENTS);
  await saveMessage(classroom.id, user.id, 'student', user.displayName, message);

  const teacher = classroom.agents.find((agent) => agent.role === 'teacher') ?? classroom.agents[0];
  if (!(await isOnTopic(message, scope))) {
    const reply = OFF_TOPIC_REPLY(classroom.title);
    await saveMessage(classroom.id, user.id, teacher.id, teacher.name, reply);
    return scriptedStream(teacher, reply);
  }

  const doc = await (
    await getOwnerScopedDocumentStore(classroom.owner_id)
  ).loadDocument(classroom.stage_id);
  if (!doc) throw new DojoError('NOT_FOUND', 'Kursinhalt nicht gefunden.');
  const toUiMessage = (m: {
    id: string;
    speaker: string;
    speakerName: string;
    content: string;
  }) => ({
    id: `m-${m.id}`,
    role: m.speaker === 'student' ? ('user' as const) : ('assistant' as const),
    parts: [{ type: 'text' as const, text: m.content }],
    metadata:
      m.speaker === 'student' ? undefined : { senderName: m.speakerName, agentId: m.speaker },
  });
  const body: StatelessChatRequest = {
    // Empty: the server-configured DeepSeek key is used (users cannot bring keys).
    apiKey: '',
    messages: [
      ...history.map(toUiMessage),
      toUiMessage({
        id: 'new',
        speaker: 'student',
        speakerName: user.displayName,
        content: message,
      }),
    ],
    storeState: {
      stage: doc.stage as StatelessChatRequest['storeState']['stage'],
      scenes: doc.scenes as StatelessChatRequest['storeState']['scenes'],
      currentSceneId: null,
      mode: 'autonomous',
      whiteboardOpen: false,
    },
    config: {
      agentIds: classroom.agents.map((agent) => agent.id),
      agentConfigs: classroom.agents.map((agent) => agentConfig(agent, scope)),
      sessionType: 'qa',
      piMaxAgentTurns: 3,
    },
  };

  const upstream = await directorChat(
    new NextRequest(new URL('/api/chat/pi', req.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify(body),
    }),
  );
  if (!upstream.ok || !upstream.body) return upstream;

  // Forward the stream; save each agent message as it finishes.
  const collector = createSpokenMessageCollector();
  const decoder = new TextDecoder();
  const saving = new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      controller.enqueue(chunk);
      for (const spoken of collector.push(decoder.decode(chunk, { stream: true }))) {
        await saveMessage(
          classroom.id,
          user.id,
          spoken.agentId,
          spoken.agentName,
          spoken.content,
        ).catch((error) => log.error('Saving agent message failed:', error));
      }
    },
  });
  return new Response(upstream.body.pipeThrough(saving), {
    status: upstream.status,
    headers: upstream.headers,
  });
}
