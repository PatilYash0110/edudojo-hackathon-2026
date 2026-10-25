/**
 * The one door to the model for DojoLearn's own calls (guard, floors,
 * questions, grading). Goes through OpenMAIC's callLLM, so usage accounting
 * and provider config (openmaic.yml) apply. Stage `quiz-grade` resolves to the
 * `classroom` slot → deepseek-flash in our config.
 *
 * OWNER: BACKEND TEAM.
 */
import type { ZodType } from 'zod';

import { callLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';

import { extractJson } from './json';

const STAGE = 'quiz-grade' as const;

/** Ask for JSON matching `schema`. Retries twice on invalid output, then throws. */
export async function askJson<T>(
  source: string,
  system: string,
  prompt: string,
  schema: ZodType<T>,
): Promise<T> {
  const { model, serverManaged } = await resolveModel({ stage: STAGE, workspaceId: null });
  let input = prompt;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { text } = await callLLM(
      { model, system, prompt: input },
      source,
      undefined,
      { enabled: false },
      { serverManaged },
    );
    const parsed = schema.safeParse(extractJson(text));
    if (parsed.success) return parsed.data;
    input = `${prompt}\n\nYour last reply did not match the required JSON format. Reply with the JSON only.`;
  }
  throw new Error(`${source}: the model did not return valid JSON`);
}
