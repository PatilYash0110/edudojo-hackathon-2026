import { describe, it, expect } from 'vitest';
import {
  MAX_RADAR_AXES,
  MIN_QUESTIONS_PER_AXIS,
  fallbackCategories,
  hasEnoughAxes,
  maxAxesFor,
  normalizeCategories,
  ratingKey,
  supportsRadar,
} from '@/lib/classroom/insights';
import type { QuizAnswerResult } from '@/lib/classroom/complete-summary';

const answer = (sceneTitle: string, correct: boolean, id = `${sceneTitle}-${correct}`) =>
  ({
    questionId: id,
    sceneId: sceneTitle,
    sceneTitle,
    question: id,
    correct,
  }) satisfies QuizAnswerResult;

describe('normalizeCategories', () => {
  it('drops malformed entries, clamps scores and deduplicates labels', () => {
    expect(
      normalizeCategories(
        [
          { label: 'Light', score: 120 },
          { label: 'light', score: 10 },
          { label: '  ', score: 50 },
          { label: 'Water', score: -5 },
          { label: 'Enzymes', score: '73' },
          { label: 'Gas', score: 'n/a' },
          null,
        ],
        20,
      ),
    ).toEqual([
      { label: 'Light', score: 100 },
      { label: 'Water', score: 0 },
      { label: 'Enzymes', score: 73 },
    ]);
  });

  it('never returns more axes than a radar can carry, keeping the spread', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: `T${i}`, score: i * 8 }));
    const axes = normalizeCategories(many, 40);
    expect(axes).toHaveLength(MAX_RADAR_AXES);
    // Both the weakest and the strongest topic survive the trim.
    expect(axes.map((a) => a.label)).toContain('T0');
    expect(axes.map((a) => a.label)).toContain('T11');
    // And the caller's order is preserved.
    expect(axes.map((a) => a.label)).toEqual([...axes.map((a) => a.label)].sort(byIndex));
  });

  it('caps the axes so every one keeps enough questions behind it', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ label: `T${i}`, score: i * 10 }));
    // 8 questions / 2 per axis = 4 axes, even though the model offered 6.
    expect(normalizeCategories(six, 8)).toHaveLength(4);
    // 20 questions leave room for all six.
    expect(normalizeCategories(six, 20)).toHaveLength(6);
  });
});

describe('maxAxesFor / supportsRadar', () => {
  it('needs MIN_QUESTIONS_PER_AXIS questions per axis', () => {
    expect(maxAxesFor(0)).toBe(0);
    expect(maxAxesFor(MIN_QUESTIONS_PER_AXIS * 3 - 1)).toBe(2);
    expect(maxAxesFor(MIN_QUESTIONS_PER_AXIS * 3)).toBe(3);
    expect(maxAxesFor(1000)).toBe(MAX_RADAR_AXES);
  });

  it('hides the radar on quizzes too short for three honest axes', () => {
    // The common one-quiz-scene course: 3 questions cannot carry a radar.
    expect(supportsRadar(3)).toBe(false);
    expect(supportsRadar(5)).toBe(false);
    expect(supportsRadar(6)).toBe(true);
  });
});

function byIndex(a: string, b: string) {
  return Number(a.slice(1)) - Number(b.slice(1));
}

describe('fallbackCategories', () => {
  it('scores each quiz scene title by its own accuracy', () => {
    expect(
      fallbackCategories([
        answer('Light', true, 'a'),
        answer('Light', false, 'b'),
        answer('Water', true, 'c'),
        answer('Water', true, 'e'),
        answer('', true, 'd'),
      ]),
    ).toEqual([
      { label: 'Light', score: 50 },
      { label: 'Water', score: 100 },
    ]);
  });

  it('obeys the same per-axis question floor as the model path', () => {
    const results = Array.from({ length: 6 }, (_, i) => answer(`Scene ${i}`, i % 2 === 0, `q${i}`));
    // One question per scene title, so the six titles collapse to three axes.
    expect(fallbackCategories(results)).toHaveLength(3);
  });
});

describe('ratingKey / hasEnoughAxes', () => {
  it('maps the design doc bands', () => {
    expect(ratingKey(85)).toBe('excelling');
    expect(ratingKey(70)).toBe('doingWell');
    expect(ratingKey(60)).toBe('satisfactory');
    expect(ratingKey(59)).toBe('needsPractice');
  });

  it('refuses a radar below a triangle', () => {
    expect(hasEnoughAxes([{ label: 'a', score: 1 }])).toBe(false);
    expect(
      hasEnoughAxes([
        { label: 'a', score: 1 },
        { label: 'b', score: 2 },
        { label: 'c', score: 3 },
      ]),
    ).toBe(true);
  });
});
