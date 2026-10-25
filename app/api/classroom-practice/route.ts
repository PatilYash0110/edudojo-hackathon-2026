/**
 * Classroom practice API
 *
 * POST: Generates a short drill on one topic the learner scored badly on.
 * The questions they missed are sent along, because what a learner actually
 * got wrong says more about the gap than the topic label does.
 *
 * Model routing reuses the `scene-content:quiz` stage: this writes quiz
 * questions for a course page, which is exactly what that stage is for.
 *
 * There is no fallback. Unlike the topic breakdown, which degrades to
 * grouping by scene title, "write four new questions" has no offline answer —
 * a failure is reported so the page can tell the learner and leave the course
 * untouched.
 */
import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess, modelAuthorizationResponse } from '@/lib/server/api-response';
import { resolveModelFromRequest } from '@/lib/server/resolve-model';
import { PRACTICE_QUESTION_COUNT } from '@/lib/classroom/practice';
import type { QuizAnswerResult } from '@/lib/classroom/complete-summary';

const log = createLogger('Classroom Practice');

/** Keep the prompt bounded on long courses. */
const MAX_MISSED_QUESTIONS = 20;

interface PracticeBody {
  courseTitle?: string;
  language?: string;
  topic?: string;
  results?: QuizAnswerResult[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PracticeBody;
    const topic = body.topic?.trim();
    if (!topic) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'topic is required');
    }

    const missed = (Array.isArray(body.results) ? body.results : [])
      .filter((result) => !result.correct)
      .slice(0, MAX_MISSED_QUESTIONS);

    const { model, thinkingConfig, serverManaged } = await resolveModelFromRequest(
      req,
      body,
      'scene-content:quiz',
    );

    const system = `You write short practice quizzes for a learner who scored badly on one topic.
Reply with JSON only, no other text:
{"questions":[{"question":"<question text>","options":["<option>","<option>","<option>","<option>"],"answer":["A"]}]}
Rules:
- Exactly ${PRACTICE_QUESTION_COUNT} questions, all about the given topic.
- 3 or 4 options each. "answer" lists the correct option letters, A for the first option.
- Use several letters only when the question genuinely has several correct options.
- Write every question and option in the lesson's language.
- Target the misunderstanding the learner's wrong answers reveal. Do not repeat those questions verbatim — ask the same idea a different way.`;

    const prompt = `Lesson: ${body.courseTitle || 'Untitled'}
Answer language: ${body.language || 'en-US'}
Topic to practise: ${topic}
Questions this learner got wrong:
${missed.length ? missed.map((result) => `- ${result.question}`).join('\n') : '- (none recorded)'}`;

    const completion = await callLLM(
      { model, system, prompt },
      'scene-content:quiz',
      undefined,
      thinkingConfig,
      { serverManaged },
    );

    const json = completion.text.match(/\{[\s\S]*\}/);
    const parsed = json ? (JSON.parse(json[0]) as { questions?: unknown }) : {};
    return apiSuccess({ questions: parsed.questions ?? [] });
  } catch (error) {
    const authorization = modelAuthorizationResponse(error);
    if (authorization) return authorization;
    log.warn('Practice generation failed:', error);
    return apiError('GENERATION_FAILED', 502, 'Could not generate practice questions');
  }
}
