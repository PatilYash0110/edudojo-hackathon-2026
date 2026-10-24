/**
 * Dojo = one topic/document; Floor = one section; Boss on the top floor.
 *
 * OWNER: SHARED (all teams)
 * STATUS: placeholder, not implemented.
 *
 * TODO: finalize fields on day 1, then convert to zod schemas
 */
import type { Challenge } from './challenge';

export interface OpenMaicLessonReference {
  /** Runtime generated and served by the Backend Team's OpenMAIC integration. */
  runtimeId: string;
  sceneIds: string[];
}

export interface LearningObjective {
  id: string;
  title: string;
  // TODO: description, bloom level
}

export interface Floor {
  id: string;
  order: number;
  title: string;
  objectives: LearningObjective[];
  challenges: Challenge[];
  /** Embedded lesson runtime from the Backend Team; never an external navigation target. */
  lesson?: OpenMaicLessonReference;
  // TODO: enemy, theme
}

export interface Boss {
  id: string;
  name: string;
  // TODO: phases, challenge pool
}

export interface Dojo {
  id: string;
  title: string;
  topic: string;
  floors: Floor[];
  boss: Boss;
  // TODO: language, createdBy, source (topic | OpenMAIC stage)
}
