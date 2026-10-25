/**
 * Turn a generated DojoLearn course into dojo floors (sections) with 2–4
 * learning objectives each. One flash call; a deterministic fallback when the
 * model fails, so a classroom never gets stuck.
 *
 * OWNER: BACKEND TEAM.
 */
import { z } from 'zod';

import type { Floor } from '@/teams/shared/contracts/backend-api';

export interface SceneRef {
  id: string;
  title: string;
  type: string;
}

export const FLOORS_SYSTEM = `You structure a generated course into sections for a learning game.
Group consecutive scenes into 2–6 sections ("floors"). For each floor give a short title and 2–4 learning objectives
("Students can ..."), written in the course's language. Use only the scene ids you are given, in order, each once.
Reply with JSON only: {"floors":[{"title":"...","sceneIds":["..."],"objectives":["..."]}]}`;

export const FloorsReply = z.object({
  floors: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        sceneIds: z.array(z.string()).min(1),
        objectives: z.array(z.string().min(3).max(200)).min(1).max(4),
      }),
    )
    .min(1)
    .max(8),
});

export function floorsPrompt(courseTitle: string, scenes: SceneRef[]): string {
  return `Course: ${courseTitle}\nScenes in order (id | type | title):\n${scenes
    .map((scene) => `${scene.id} | ${scene.type} | ${scene.title}`)
    .join('\n')}`;
}

/** Keep only known scene ids, drop empty floors, assign stable ids. Null reply → 3 scenes per floor. */
export function normalizeFloors(
  reply: z.infer<typeof FloorsReply> | null,
  scenes: SceneRef[],
): Floor[] {
  const known = new Set(scenes.map((scene) => scene.id));
  const used = new Set<string>();
  const drafts = reply
    ? reply.floors.map((floor) => ({
        title: floor.title,
        sceneIds: floor.sceneIds.filter((id) => {
          if (!known.has(id) || used.has(id)) return false;
          used.add(id);
          return true;
        }),
        objectives: floor.objectives,
      }))
    : Array.from({ length: Math.ceil(scenes.length / 3) }, (_, i) => {
        const chunk = scenes.slice(i * 3, i * 3 + 3);
        return {
          title: chunk[0].title,
          sceneIds: chunk.map((s) => s.id),
          objectives: chunk.map((s) => s.title),
        };
      });
  return drafts
    .filter((floor) => floor.sceneIds.length > 0)
    .map((floor, i) => ({
      id: `f${i + 1}`,
      order: i + 1,
      title: floor.title,
      sceneIds: floor.sceneIds,
      objectives: floor.objectives.map((title, j) => ({ id: `f${i + 1}-o${j + 1}`, title })),
    }));
}
