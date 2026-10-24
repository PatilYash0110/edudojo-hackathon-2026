/**
 * Classroom insights API
 *
 * POST: Receives the graded quiz questions of a finished course and asks the
 * LLM to group them into 3–8 topic categories. The model groups; the scores
 * are computed from its grouping, because weighted accuracy is arithmetic a
 * language model has no reason to get right, and it cannot know that a
 * practice question counts for half.
 *
 * The axis ceiling follows the question count (see `maxAxesFor`): a category
 * carrying a single question can only score 0% or 100%, so short quizzes get
 * fewer axes, and quizzes too short for three axes are answered from the
 * fallback without calling a model.
 *
 * Model routing reuses the `quiz-grade` stage: both run at the end of a
 * classroom session on the same `classroom` slot, so this needs no new stage
 * key in `LLM_STAGES`/`STAGE_SLOTS`.
 */
import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess, modelAuthorizationResponse } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import {
  MIN_QUESTIONS_PER_AXIS,
  MIN_RADAR_AXES,
  fallbackCategories,
  hasEnoughAxes,
  maxAxesFor,
  normalizeCategories,
  supportsRadar,
} from '@/lib/classroom/insights';
import type { QuizAnswerResult } from '@/lib/classroom/complete-summary';

const log = createLogger('Classroom Insights');

/** Keep the prompt bounded on very long courses. */
const MAX_QUESTIONS = 60;

interface InsightsBody {
  courseTitle?: string;
  language?: string;
  results?: QuizAnswerResult[];
}

export async function POST(req: NextRequest) {
  let results: QuizAnswerResult[] = [];
  try {
    const body = (await req.json()) as InsightsBody;
    results = Array.isArray(body.results) ? body.results.slice(0, MAX_QUESTIONS) : [];
    if (results.length === 0) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'results are required');
    }
    if (!supportsRadar(results.length)) {
      return apiSuccess({ categories: fallbackCategories(results) });
    }
    const maxAxes = maxAxesFor(results.length);

    const { model, thinkingConfig, serverManaged } = await resolveModelFromRequest(
      req,
      body,
      'quiz-grade',
    );

    const system = `You group quiz questions of a finished lesson into topic categories for a radar chart.
Reply with JSON only, no other text:
{"categories":[{"label":"<2-3 word topic>","score":<0-100 integer>}]}
Rules:
- Between ${MIN_RADAR_AXES} and ${maxAxes} categories. Never more than ${maxAxes}.
- Every question belongs to exactly one category.
- Every category holds at least ${MIN_QUESTIONS_PER_AXIS} questions. Merge related topics rather than leaving a category with one question.
- score is the learner's accuracy in that category: correct questions / questions in it * 100.
- Labels are short noun phrases in the lesson's language, distinct from each other.`;

    const prompt = `Lesson: ${body.courseTitle || 'Untitled'}
Answer language: ${body.language || 'en-US'}
Questions (result | text):
${results.map((r) => `${r.correct ? 'correct' : 'wrong'} | ${r.question}`).join('\n')}`;

    const completion = await callLLM(
      { model, system, prompt },
      'quiz-grade',
      undefined,
      thinkingConfig,
      { serverManaged },
    );

    const json = completion.text.match(/\{[\s\S]*\}/);
    const parsed = json ? (JSON.parse(json[0]) as { categories?: unknown }) : {};
    const categories = normalizeCategories(parsed.categories, results);
    return apiSuccess({
      categories: hasEnoughAxes(categories) ? categories : fallbackCategories(results),
    });
  } catch (error) {
    const authorization = modelAuthorizationResponse(error);
    if (authorization) return authorization;
    log.warn('Insight grouping failed; falling back to scene titles:', error);
    // A missing or failing model must not cost the learner the chart.
    return apiSuccess({ categories: fallbackCategories(results) });
  }
}
