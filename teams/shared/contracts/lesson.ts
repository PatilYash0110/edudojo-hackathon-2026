/**
 * Lesson runtime events. The embedded OpenMAIC lesson reports completion; Game unlocks the battle.
 *
 * OWNER: SHARED (all teams)
 * STATUS: locked for Milestone 1. Additive changes only; tell every team.
 */
import { z } from 'zod';

export const LessonCompletedEventSchema = z.object({
  type: z.literal('LESSON_COMPLETED'),
  dojoId: z.string().min(1),
  floorId: z.string().min(1),
  completedObjectiveIds: z.array(z.string().min(1)),
});
export type LessonCompletedEvent = z.infer<typeof LessonCompletedEventSchema>;
