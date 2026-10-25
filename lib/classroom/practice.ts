/**
 * Targeted practice for the topics a learner scored badly on.
 *
 * The completion page's breakdown names the weak topics; this asks the model
 * for a short drill on one of them, built from the questions that learner
 * actually got wrong rather than from the topic label alone.
 *
 * Practice questions live in one accumulating quiz scene appended to the
 * course, and carry half the weight of a course question (`points`), so
 * drilling moves the score without letting it be farmed.
 */
import type { QuizQuestion } from '@/lib/types/stage';
import type { QuizAnswerResult } from '@/lib/classroom/complete-summary';

/** Questions per topic drill. Short enough that a struggling learner finishes. */
export const PRACTICE_QUESTION_COUNT = 4;
/** A practice question is worth half a course question. */
export const PRACTICE_POINTS = 0.5;
/** Below this score a topic is offered for practice (the `needsPractice` band). */
export const PRACTICE_THRESHOLD = 60;

/**
 * Practice question ids carry the topic they drill, so the completion page can
 * tell which topics have already been practised by reading the scene back
 * instead of storing that fact a second time where it could drift.
 */
const PRACTICE_ID_PREFIX = 'practice';
const SEPARATOR = '::';

export function practiceQuestionId(topic: string, index: number): string {
  return [PRACTICE_ID_PREFIX, encodeURIComponent(topic), index].join(SEPARATOR);
}

/** The topic a practice question drills, or undefined for a course question. */
export function practiceTopicOf(questionId: string): string | undefined {
  const parts = questionId.split(SEPARATOR);
  if (parts.length !== 3 || parts[0] !== PRACTICE_ID_PREFIX) return undefined;
  try {
    return decodeURIComponent(parts[1]!);
  } catch {
    return parts[1];
  }
}

/** Topics already drilled, read straight off the questions in hand. */
export function practisedTopics(questions: QuizQuestion[]): Set<string> {
  const topics = new Set<string>();
  for (const question of questions) {
    const topic = practiceTopicOf(question.id);
    if (topic) topics.add(topic);
  }
  return topics;
}

export interface PracticeRequest {
  courseTitle: string;
  language: string;
  topic: string;
  /** The learner's answered questions; only the missed ones are sent. */
  results: QuizAnswerResult[];
}

/** Validate whatever the model returned before it becomes a quiz scene. */
export function normalizePracticeQuestions(raw: unknown, topic: string): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: QuizQuestion[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { question, options, answer } = entry as {
      question?: unknown;
      options?: unknown;
      answer?: unknown;
    };
    if (typeof question !== 'string' || !question.trim()) continue;
    if (!Array.isArray(options) || options.length < 2) continue;
    const cleanOptions = options
      .filter((option): option is string => typeof option === 'string' && !!option.trim())
      .map((option, index) => ({ value: String.fromCharCode(65 + index), label: option.trim() }));
    if (cleanOptions.length < 2) continue;
    // An answer that names no option would be ungradeable, so the question is
    // dropped rather than shown as unanswerable.
    const answers = (Array.isArray(answer) ? answer : [answer])
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => cleanOptions.some((option) => option.value === value));
    if (answers.length === 0) continue;
    questions.push({
      id: practiceQuestionId(topic, questions.length),
      type: answers.length > 1 ? 'multiple' : 'single',
      question: question.trim(),
      options: cleanOptions,
      answer: answers,
      hasAnswer: true,
      points: PRACTICE_POINTS,
    });
    if (questions.length >= PRACTICE_QUESTION_COUNT) break;
  }
  return questions;
}

/**
 * Ask the server for a drill on one topic. Throws on failure: unlike the
 * topic breakdown, there is no useful fallback for "generate new questions",
 * and the caller has to tell the learner it did not work.
 */
export async function fetchPracticeQuestions(
  request: PracticeRequest,
  signal?: AbortSignal,
): Promise<QuizQuestion[]> {
  const res = await fetch('/api/classroom-practice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok) throw new Error(`practice generation failed: ${res.status}`);
  const data = (await res.json()) as { questions?: unknown };
  const questions = normalizePracticeQuestions(data.questions, request.topic);
  if (questions.length === 0) throw new Error('practice generation returned no usable questions');
  return questions;
}

/**
 * Merge a drill into the questions a practice scene already holds, replacing
 * any earlier attempt at the same topic so the scene stays proportional to the
 * number of weak topics rather than to how often a button was pressed.
 */
export function mergePracticeQuestions(
  existing: QuizQuestion[],
  topic: string,
  generated: QuizQuestion[],
): QuizQuestion[] {
  return [...existing.filter((question) => practiceTopicOf(question.id) !== topic), ...generated];
}
