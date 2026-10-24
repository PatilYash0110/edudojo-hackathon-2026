/**
 * Dojo = one topic/document; Floor = one section; Boss on the top floor.
 *
 * OWNER: SHARED (all teams)
 * STATUS: locked for Milestone 1. Additive changes only; tell every team.
 */
import { z } from 'zod';
import { ChallengeSchema } from './challenge';

export const OpenMaicLessonReferenceSchema = z.object({
  /** Runtime generated and served by the Backend Team's OpenMAIC integration. */
  runtimeId: z.string().min(1),
  sceneIds: z.array(z.string().min(1)),
});
export type OpenMaicLessonReference = z.infer<typeof OpenMaicLessonReferenceSchema>;

export const LearningObjectiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
});
export type LearningObjective = z.infer<typeof LearningObjectiveSchema>;

export const FloorSchema = z.object({
  id: z.string().min(1),
  /** 1-based position in the tower. */
  order: z.number().int().positive(),
  title: z.string().min(1),
  objectives: z.array(LearningObjectiveSchema).min(1),
  challenges: z.array(ChallengeSchema),
  /** Embedded lesson runtime from the Backend Team; never an external navigation target. */
  lesson: OpenMaicLessonReferenceSchema.optional(),
});
export type Floor = z.infer<typeof FloorSchema>;

export const BossSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});
export type Boss = z.infer<typeof BossSchema>;

export const DojoSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    topic: z.string().min(1),
    floors: z.array(FloorSchema).min(1),
    boss: BossSchema,
  })
  .superRefine((dojo, ctx) => {
    dojo.floors.forEach((floor, index) => {
      if (floor.order !== index + 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['floors', index, 'order'],
          message: `Floors must be ordered 1..n; expected ${index + 1}, got ${floor.order}.`,
        });
      }
    });
    const objectiveIds = dojo.floors.flatMap((floor) => floor.objectives.map((o) => o.id));
    if (new Set(objectiveIds).size !== objectiveIds.length) {
      ctx.addIssue({ code: 'custom', path: ['floors'], message: 'Objective ids must be unique.' });
    }
  });
export type Dojo = z.infer<typeof DojoSchema>;

export const CreateDojoInputSchema = z.object({
  topic: z.string().trim().min(1).max(2000),
});
export type CreateDojoInput = z.infer<typeof CreateDojoInputSchema>;
