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

const answer = (
  sceneTitle: string,
  correct: boolean,
  id = `${sceneTitle}-${correct}`,
  weight = 1,
) =>
  ({
    questionId: id,
    sceneId: sceneTitle,
    sceneTitle,
    question: id,
    correct,
    weight,
  }) satisfies QuizAnswerResult;

/** `n` answers in one scene, the first `rightCount` of them correct. */
const answers = (sceneTitle: string, n: number, rightCount: number, weight = 1) =>
  Array.from({ length: n }, (_, i) =>
    answer(sceneTitle, i < rightCount, `${sceneTitle}-${i}`, weight),
  );

describe('normalizeCategories', () => {
  const pool = answers('Scene', 12, 6);

  it('drops malformed entries, deduplicates labels and scores from the grouping', () => {
    expect(
      normalizeCategories(
        [
          { label: 'Light', questions: [1, 2] },
          { label: 'light', questions: [3] },
          { label: '  ', questions: [4] },
          { label: 'Water', questions: [8, 9] },
          { label: 'Enzymes', questions: [6, 7] },
          { label: 'NoQuestions', questions: [] },
          null,
        ],
        pool,
      ),
    ).toEqual([
      // The first 6 of the 12 pooled answers are correct: 1-2 right, 7-8
      // wrong, and 6-7 straddle the boundary.
      { label: 'Light', score: 100 },
      { label: 'Water', score: 0 },
      { label: 'Enzymes', score: 50 },
    ]);
  });

  it('counts a question for one category only, however many claim it', () => {
    const categories = normalizeCategories(
      [
        { label: 'First', questions: [1, 2, 3] },
        { label: 'Second', questions: [3, 4, 5] },
      ],
      pool,
    );
    // Question 3 belongs to First, so Second is scored on 4 and 5 alone.
    expect(categories.map((c) => c.label)).toEqual(['First', 'Second']);
    expect(categories[0]?.score).toBe(100);
  });

  it('weights a half-point practice answer as half an answer', () => {
    // One correct course question, one wrong practice question at half weight:
    // 1 of 1.5 points earned.
    const mixed = [answer('S', true, 'course'), answer('S', false, 'practice', 0.5)];
    expect(normalizeCategories([{ label: 'Topic', questions: [1, 2] }], mixed)[0]?.score).toBe(67);
  });

  it('ignores question numbers outside the list it was given', () => {
    expect(normalizeCategories([{ label: 'Topic', questions: [0, 99, 1] }], pool)[0]).toEqual({
      label: 'Topic',
      score: 100,
    });
  });

  it('never returns more axes than a radar can carry, keeping the spread', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: `T${i}`, questions: [i + 1] }));
    const axes = normalizeCategories(many, answers('Scene', 40, 20));
    expect(axes).toHaveLength(MAX_RADAR_AXES);
    expect(axes.map((a) => a.label)).toEqual([...axes.map((a) => a.label)].sort(byIndex));
  });

  it('caps the axes so every one keeps enough questions behind it', () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ label: `T${i}`, questions: [i + 1] }));
    expect(normalizeCategories(six, answers('Scene', 8, 4))).toHaveLength(4);
    expect(normalizeCategories(six, answers('Scene', 20, 10))).toHaveLength(6);
  });
});

function byIndex(a: string, b: string) {
  return Number(a.slice(1)) - Number(b.slice(1));
}

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

describe('fallbackCategories', () => {
  it('weights a half-point practice answer as half an answer', () => {
    expect(
      fallbackCategories([
        answer('Light', true, 'a'),
        answer('Light', false, 'b', 0.5),
        answer('Water', true, 'c'),
        answer('Water', true, 'd'),
      ]),
    ).toEqual([
      // 1 of 1.5 points on Light, everything right on Water.
      { label: 'Light', score: 67 },
      { label: 'Water', score: 100 },
    ]);
  });

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
