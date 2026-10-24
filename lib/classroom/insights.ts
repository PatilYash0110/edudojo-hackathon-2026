/**
 * Topic breakdown for the classroom completion page's radar chart.
 *
 * Quiz questions carry no category field (see `QuizQuestion` in
 * `@openmaic/dsl`), so the axes are derived at completion time: the LLM groups
 * the answered questions into topics, and when no model is reachable the
 * questions fall back to grouping by their quiz scene title.
 *
 * Radar charts stop being readable past 8 axes and are degenerate below 3, so
 * both ends are clamped here rather than in the component.
 *
 * An axis also needs enough questions behind it to mean anything: one question
 * per topic only ever scores 0% or 100%, which reads as a spiky artefact rather
 * than a skill profile. So the axis count is capped by the question count too,
 * and a short quiz simply gets no radar.
 */
import type { QuizAnswerResult } from '@/lib/classroom/complete-summary';

export const MAX_RADAR_AXES = 8;
export const MIN_RADAR_AXES = 3;
/** Fewer than this behind an axis and its score is noise, not a signal. */
export const MIN_QUESTIONS_PER_AXIS = 2;

/** How many axes this many graded questions can honestly support. */
export function maxAxesFor(questionCount: number): number {
  return Math.min(MAX_RADAR_AXES, Math.floor(questionCount / MIN_QUESTIONS_PER_AXIS));
}

/** True when a quiz is long enough for a radar to be worth drawing at all. */
export function supportsRadar(questionCount: number): boolean {
  return maxAxesFor(questionCount) >= MIN_RADAR_AXES;
}

export interface InsightCategory {
  /** Short axis label — kept terse so it fits around the radar. */
  label: string;
  /** Accuracy for this category, 0–100. */
  score: number;
}

/** Rating bands from the learning-insights design doc. */
export type RatingKey = 'excelling' | 'doingWell' | 'satisfactory' | 'needsPractice';

export function ratingKey(score: number): RatingKey {
  if (score >= 85) return 'excelling';
  if (score >= 70) return 'doingWell';
  if (score >= 60) return 'satisfactory';
  return 'needsPractice';
}

/** Weighted accuracy, so half-weight practice answers count for half. */
function weightedScore(answers: QuizAnswerResult[]): number {
  let earned = 0;
  let total = 0;
  for (const answer of answers) {
    total += answer.weight;
    if (answer.correct) earned += answer.weight;
  }
  return total > 0 ? Math.round((earned / total) * 100) : 0;
}

/** Trim a label to something that still fits as a radar axis caption. */
function trimLabel(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 22 ? `${clean.slice(0, 21)}…` : clean;
}

/**
 * Keep the strongest axes when a course has more topics than the radar — or
 * the question count — can carry: the widest spread (best and worst) is what
 * the learner acts on, so sort by score and take from both ends.
 */
function clampAxes(categories: InsightCategory[], maxAxes: number): InsightCategory[] {
  if (categories.length <= maxAxes) return categories;
  const sorted = [...categories].sort((a, b) => a.score - b.score);
  const picked: InsightCategory[] = [];
  while (picked.length < maxAxes) {
    picked.push(sorted.shift()!);
    if (picked.length < maxAxes && sorted.length) picked.push(sorted.pop()!);
  }
  // Restore the caller's original order so the axes stay stable between renders.
  return categories.filter((c) => picked.includes(c));
}

/** Group graded answers by their quiz scene title. Used when no LLM answers. */
export function fallbackCategories(results: QuizAnswerResult[]): InsightCategory[] {
  const byTitle = new Map<string, QuizAnswerResult[]>();
  for (const result of results) {
    const key = trimLabel(result.sceneTitle || '');
    if (!key) continue;
    byTitle.set(key, [...(byTitle.get(key) ?? []), result]);
  }
  const categories = [...byTitle].map(([label, answers]) => ({
    label,
    score: weightedScore(answers),
  }));
  return clampAxes(categories, maxAxesFor(results.length));
}

/**
 * Turn the model's grouping into scored axes.
 *
 * The model returns which questions belong to each topic, by their 1-based
 * position in the list it was given, and the scoring is done here. Asking a
 * language model for `correct / total * 100` was asking it to do arithmetic
 * it has no reason to get right, and it could not weight practice answers at
 * all, since it does not know what a question is worth.
 */
export function normalizeCategories(raw: unknown, results: QuizAnswerResult[]): InsightCategory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const claimed = new Set<number>();
  const categories: InsightCategory[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { label, questions } = entry as { label?: unknown; questions?: unknown };
    if (typeof label !== 'string' || !label.trim()) continue;
    const clean = trimLabel(label);
    const dedupeKey = clean.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    // One question belongs to one topic: a model that lists the same question
    // under two topics would otherwise have it counted twice.
    const answers = (Array.isArray(questions) ? questions : [])
      .map((value) => Number(value) - 1)
      .filter((index) => Number.isInteger(index) && index >= 0 && index < results.length)
      .filter((index) => !claimed.has(index) && (claimed.add(index), true))
      .map((index) => results[index]!);
    if (answers.length === 0) continue;
    seen.add(dedupeKey);
    categories.push({ label: clean, score: weightedScore(answers) });
  }
  return clampAxes(categories, maxAxesFor(results.length));
}

/** A radar needs at least a triangle to read as one. */
export function hasEnoughAxes(categories: InsightCategory[]): boolean {
  return categories.length >= MIN_RADAR_AXES;
}

export interface InsightsRequest {
  courseTitle: string;
  language: string;
  results: QuizAnswerResult[];
}

/**
 * Ask the server for LLM topic grouping, falling back to scene titles on any
 * failure. Never throws: the completion page renders with or without it.
 */
export async function fetchInsightCategories(
  request: InsightsRequest,
  signal?: AbortSignal,
): Promise<InsightCategory[]> {
  const fallback = fallbackCategories(request.results);
  // Too short for an honest radar: skip the request rather than pay for a
  // grouping the page will not draw.
  if (!supportsRadar(request.results.length)) return fallback;
  try {
    const res = await fetch('/api/classroom-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { categories?: unknown };
    const categories = normalizeCategories(data.categories, request.results);
    return hasEnoughAxes(categories) ? categories : fallback;
  } catch {
    return fallback;
  }
}
