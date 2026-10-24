import { describe, it, expect } from 'vitest';
import {
  PRACTICE_POINTS,
  PRACTICE_QUESTION_COUNT,
  mergePracticeQuestions,
  normalizePracticeQuestions,
  practiceQuestionId,
  practiceTopicOf,
  practisedTopics,
} from '@/lib/classroom/practice';
import type { QuizQuestion } from '@/lib/types/stage';

const modelQuestion = (question: string, options: string[], answer: string[]) => ({
  question,
  options,
  answer,
});

describe('normalizePracticeQuestions', () => {
  it('turns a model answer into gradeable half-weight questions', () => {
    const questions = normalizePracticeQuestions(
      [modelQuestion('Was ist ATP?', ['Energie', 'Zucker', 'Licht'], ['A'])],
      'Calvin cycle',
    );
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      type: 'single',
      question: 'Was ist ATP?',
      answer: ['A'],
      hasAnswer: true,
      points: PRACTICE_POINTS,
    });
    // Options are keyed A, B, C so the stored answer names a real option.
    expect(questions[0]?.options?.map((o) => o.value)).toEqual(['A', 'B', 'C']);
  });

  it('drops questions that could never be graded', () => {
    expect(
      normalizePracticeQuestions(
        [
          modelQuestion('No options', [], ['A']),
          modelQuestion('One option', ['only'], ['A']),
          // Names an option that does not exist.
          modelQuestion('Bad answer', ['a', 'b'], ['D']),
          modelQuestion('', ['a', 'b'], ['A']),
          modelQuestion('Fine', ['a', 'b'], ['B']),
        ],
        'Topic',
      ).map((q) => q.question),
    ).toEqual(['Fine']);
  });

  it('marks several correct options as a multiple-choice question', () => {
    const [question] = normalizePracticeQuestions(
      [modelQuestion('Which two?', ['a', 'b', 'c'], ['A', 'C'])],
      'Topic',
    );
    expect(question?.type).toBe('multiple');
    expect(question?.answer).toEqual(['A', 'C']);
  });

  it('never returns more than the drill length', () => {
    const many = Array.from({ length: 10 }, (_, i) => modelQuestion(`Q${i}`, ['a', 'b'], ['A']));
    expect(normalizePracticeQuestions(many, 'Topic')).toHaveLength(PRACTICE_QUESTION_COUNT);
  });

  it('survives a model that returned nothing usable', () => {
    expect(normalizePracticeQuestions(null, 'Topic')).toEqual([]);
    expect(normalizePracticeQuestions([{ nope: true }], 'Topic')).toEqual([]);
  });
});

describe('practice question ids', () => {
  it('round-trips a topic, including one with separators in it', () => {
    const topic = 'Licht & Dunkel :: Reaktion';
    expect(practiceTopicOf(practiceQuestionId(topic, 0))).toBe(topic);
  });

  it('reports no topic for a course question', () => {
    expect(practiceTopicOf('q-17')).toBeUndefined();
    expect(practiceTopicOf('practice::only-two-parts')).toBeUndefined();
  });

  it('reads the practised topics straight off the questions', () => {
    const questions = [
      ...normalizePracticeQuestions([modelQuestion('a', ['x', 'y'], ['A'])], 'Calvin cycle'),
      ...normalizePracticeQuestions([modelQuestion('b', ['x', 'y'], ['A'])], 'Gas exchange'),
      { id: 'course-1', type: 'single', question: 'c' } as QuizQuestion,
    ];
    expect([...practisedTopics(questions)].sort()).toEqual(['Calvin cycle', 'Gas exchange']);
  });
});

describe('mergePracticeQuestions', () => {
  it('replaces a topic rather than growing the scene on every press', () => {
    const first = normalizePracticeQuestions([modelQuestion('old', ['x', 'y'], ['A'])], 'Topic A');
    const other = normalizePracticeQuestions([modelQuestion('keep', ['x', 'y'], ['A'])], 'Topic B');
    const second = normalizePracticeQuestions([modelQuestion('new', ['x', 'y'], ['A'])], 'Topic A');

    const merged = mergePracticeQuestions([...first, ...other], 'Topic A', second);

    expect(merged.map((q) => q.question)).toEqual(['keep', 'new']);
    // Both topics still readable from the merged scene.
    expect([...practisedTopics(merged)].sort()).toEqual(['Topic A', 'Topic B']);
  });
});
