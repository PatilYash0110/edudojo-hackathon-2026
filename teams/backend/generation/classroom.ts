/**
 * Classrooms: start OpenMAIC's generation run (slides + narration script +
 * quiz, narrated with the configured TTS), then — when the run completes —
 * split it into floors with learning objectives and publish class classrooms
 * so students can open the player.
 *
 * OWNER: BACKEND TEAM.
 */
import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

import { setStagePublished } from '@/lib/persistence/stage-meta';
import { getOwnerScopedDocumentStore } from '@/lib/server/agent-runtime/owner-scoped-documents';
import { classroomJobView, requiredModelRefusal } from '@/lib/server/generate-classroom-job';
import { parseRunInput } from '@/lib/server/generation/run/input';
import { startGenerationRun, startRefusal } from '@/lib/server/generation/run/start';
import { readGenerationRun } from '@/lib/server/generation/run/store';
import { withRequestOwner } from '@/lib/server/identity/with-owner';
import { getStageAccessDb } from '@/lib/server/stage-access';
import { createLogger } from '@/lib/logger';
import type {
  ChatAgent,
  Classroom,
  ClassroomStatus,
  Floor,
} from '@/teams/shared/contracts/backend-api';

import { pickChatAgents } from '../agents/personas';
import { askJson } from '../ai/llm';
import { DojoError, fail, ok } from '../api/http';
import type { DojoUser } from '../auth/session';
import { db } from '../data/db';
import { consumeQuota, gateLearningPrompt } from '../guard/guard';
import { FLOORS_SYSTEM, FloorsReply, floorsPrompt, normalizeFloors, type SceneRef } from './floors';

const log = createLogger('Dojo Classroom');

// Keeps live demo runs short (5 scenes instead of ~8-10). German, so the outline keeps German as
// the course language. shortcut: prompt-only, the model may still return more; add a server-side
// cap in the run engine if a run ever overshoots.
const DEMO_SCENE_PROFILE =
  '\n\nUmfang: kurze Einheit von etwa 5 Minuten mit genau 5 Szenen in dieser Reihenfolge: ' +
  '1. Einstieg und Überblick (slide), 2. Kernerklärung (slide), ' +
  '3. interaktives Modell oder Simulation (interactive), 4. Wissenscheck (quiz), ' +
  '5. Zusammenfassung und nächster Schritt (slide). Keine pbl-Szene.';

export interface ClassroomRow {
  id: string;
  creator_id: string;
  class_id: string | null;
  owner_id: string;
  run_id: string;
  stage_id: string | null;
  title: string;
  prompt: string;
  status: ClassroomStatus | 'finishing';
  error: string | null;
  floors: Floor[];
  agents: ChatAgent[];
  created_at: Date;
}

export function toClassroom(row: ClassroomRow, progress = 100): Classroom {
  const ready = row.status === 'ready';
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    status: row.status === 'finishing' ? 'generating' : row.status,
    progress: ready ? 100 : row.status === 'failed' ? 0 : Math.min(progress, 99),
    error: row.error,
    classId: row.class_id,
    stageId: row.stage_id,
    runId: row.run_id,
    playerUrl: ready && row.stage_id ? `/classroom/${row.stage_id}` : null,
    floors: row.floors,
    agents: row.agents,
    createdAt: row.created_at.toISOString(),
  };
}

/** The classroom if this user may see it: creator, or a student of its class. */
export async function loadClassroom(user: DojoUser, id: string): Promise<ClassroomRow> {
  const pool = await db();
  const { rows } = await pool.query<ClassroomRow>(
    `SELECT * FROM dojo_classrooms WHERE id = $1 AND (creator_id = $2 OR (class_id IS NOT NULL AND class_id = $3))`,
    [id, user.id, user.classId],
  );
  if (!rows[0]) throw new DojoError('NOT_FOUND', 'Klassenzimmer nicht gefunden.');
  return rows[0];
}

export async function listClassrooms(user: DojoUser): Promise<ClassroomRow[]> {
  const pool = await db();
  const { rows } = await pool.query<ClassroomRow>(
    `SELECT * FROM dojo_classrooms WHERE creator_id = $1 OR (class_id IS NOT NULL AND class_id = $2)
     ORDER BY created_at DESC LIMIT 100`,
    [user.id, user.classId],
  );
  return rows;
}

export async function createClassroom(
  req: NextRequest,
  user: DojoUser,
  body: { prompt: string; materialIds?: string[]; classId?: string },
): Promise<Response> {
  const pool = await db();
  let classId: string | null = null;
  if (body.classId) {
    if (user.role !== 'teacher')
      throw new DojoError('FORBIDDEN', 'Nur Lehrkräfte teilen Klassenzimmer mit einer Klasse.');
    const owned = await pool.query('SELECT 1 FROM dojo_classes WHERE id = $1 AND teacher_id = $2', [
      body.classId,
      user.id,
    ]);
    if (!owned.rowCount) throw new DojoError('NOT_FOUND', 'Klasse nicht gefunden.');
    classId = body.classId;
  }
  await consumeQuota(user, 'classroom');
  const goal = await gateLearningPrompt(body.prompt);

  // The run belongs to the browser's OpenMAIC owner, like the uploaded materials.
  return withRequestOwner(req, async (principal, headers) => {
    const respond = (res: Response) => {
      headers.forEach((value, key) => res.headers.append(key, value));
      return res;
    };
    const refused = await requiredModelRefusal(principal.ownerId);
    if (refused)
      return respond(fail('INTERNAL_ERROR', `KI-Modell nicht konfiguriert: ${refused.message}`));
    const input = parseRunInput({
      requirement: goal + DEMO_SCENE_PROFILE,
      materialIds: body.materialIds ?? [],
      outlineReview: 'auto',
      // OpenMAIC's teacher narrates the slides; chat agents are ours (see personas.ts).
      agents: { mode: 'preset', agentIds: ['default-1'] },
    });
    if (!input.ok) return respond(fail('INVALID_REQUEST', input.message));
    let runId: string;
    try {
      runId = (
        await startGenerationRun(principal.ownerId, input.value, {
          principal,
          request: req,
          origin: 'generate-classroom',
        })
      ).id;
    } catch (error) {
      const refusal = startRefusal(error);
      if (refusal) return respond(fail('RATE_LIMITED', refusal.message));
      throw error;
    }
    const { rows } = await pool.query<ClassroomRow>(
      `INSERT INTO dojo_classrooms (id, creator_id, class_id, owner_id, run_id, title, prompt, agents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        randomUUID(),
        user.id,
        classId,
        principal.ownerId,
        runId,
        goal,
        body.prompt,
        JSON.stringify(pickChatAgents()),
      ],
    );
    return respond(ok({ classroom: toClassroom(rows[0], 0) }, 202));
  });
}

/**
 * Advance a generating classroom by reading its run. Called on every GET, so
 * the frontend just polls. The `finishing` claim makes one request do the
 * floor planning when several polls arrive together.
 */
export async function refreshClassroom(row: ClassroomRow): Promise<Classroom> {
  if (row.status !== 'generating') return toClassroom(row);
  const pool = await db();
  const run = await readGenerationRun(row.run_id, row.owner_id);
  const setStatus = async (
    status: ClassroomStatus,
    error: string | null,
    extra: Partial<ClassroomRow> = {},
  ) => {
    const { rows } = await pool.query<ClassroomRow>(
      `UPDATE dojo_classrooms SET status = $2, error = $3, stage_id = COALESCE($4, stage_id), floors = COALESCE($5, floors)
       WHERE id = $1 RETURNING *`,
      [
        row.id,
        status,
        error,
        extra.stage_id ?? null,
        extra.floors ? JSON.stringify(extra.floors) : null,
      ],
    );
    return toClassroom(rows[0]);
  };
  if (!run || run.state === 'ended')
    return setStatus('failed', 'Die Generierung wurde abgebrochen.');
  // shortcut: a paused run (a step failed after retries) is shown as failed; OpenMAIC's
  // POST /api/generation-runs/<runId>/retry could resume it.
  if (run.state === 'paused')
    return setStatus('failed', 'Die Generierung ist fehlgeschlagen. Bitte erneut versuchen.');
  if (run.state !== 'completed' || !run.stageId || run.mediaPending) {
    return toClassroom(row, classroomJobView(run, {}, '').progress);
  }

  const claimed = await pool.query(
    `UPDATE dojo_classrooms SET status = 'finishing' WHERE id = $1 AND status = 'generating'`,
    [row.id],
  );
  if (!claimed.rowCount) return toClassroom({ ...row, status: 'finishing' }, 99);
  try {
    const store = await getOwnerScopedDocumentStore(row.owner_id);
    const doc = await store.loadDocument(run.stageId);
    const scenes: SceneRef[] = (doc?.scenes ?? [])
      .map((scene) => scene as unknown as SceneRef & { order: number })
      .sort((a, b) => a.order - b.order)
      .map(({ id, title, type }) => ({ id, title, type }));
    const title = doc?.stage.name || row.title;
    const reply = await askJson(
      'dojo-floors',
      FLOORS_SYSTEM,
      floorsPrompt(title, scenes),
      FloorsReply,
    ).catch((error) => {
      log.warn('Floor planning fell back to fixed chunks:', error);
      return null;
    });
    if (row.class_id)
      await setStagePublished(await getStageAccessDb(), run.stageId, true, Date.now());
    await pool.query('UPDATE dojo_classrooms SET title = $2 WHERE id = $1', [row.id, title]);
    return setStatus('ready', null, {
      stage_id: run.stageId,
      floors: normalizeFloors(reply, scenes),
    });
  } catch (error) {
    log.error('Finishing classroom failed:', error);
    await pool.query(`UPDATE dojo_classrooms SET status = 'generating' WHERE id = $1`, [row.id]);
    throw error;
  }
}
