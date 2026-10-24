import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '@/lib/logger';

const streamLLMMock = vi.fn();

vi.mock('@/lib/ai/llm', () => ({
  streamLLM: (...args: unknown[]) => streamLLMMock(...args),
}));

vi.mock('@/lib/server/llm-fallback', () => ({
  resolveFallbackModel: vi.fn(),
  shouldFallbackFor: vi.fn().mockReturnValue(false),
  logFallbackFired: vi.fn(),
}));

import { generateOutlines } from '@/lib/server/generation/steps/outline';
import type { SceneOutline } from '@/lib/types/generation';

function fullStreamOf(parts: Array<Record<string, unknown>>) {
  return {
    fullStream: (async function* () {
      for (const part of parts) yield part;
    })(),
  };
}

const model = {
  model: { provider: 'openai.responses', modelId: 'gpt-5.4' },
  modelInfo: { capabilities: {} },
  modelString: 'openai:gpt-5.4',
  thinkingConfig: undefined,
  serverManaged: true,
};

async function outlinesFrom(responseText: string): Promise<SceneOutline[]> {
  streamLLMMock.mockImplementation(() =>
    fullStreamOf([
      { type: 'text-delta', text: responseText },
      { type: 'finish', finishReason: 'stop' },
    ]),
  );
  const result = await generateOutlines(
    {
      requirements: { requirement: 'Teach the Fourier transform', interactiveMode: true },
      model: model as never,
    },
    {
      log: createLogger('Outline'),
      workspaceId: null,
      resolveVisionImages: async (images) => [...images],
    } as never,
  );
  return result.outlines;
}

describe('every course meets the scene floor', () => {
  beforeEach(() => streamLLMMock.mockReset());

  it('appends a quiz when an interactive-mode outline came back without one', async () => {
    const outlines = await outlinesFrom(
      JSON.stringify({
        languageDirective: 'English',
        courseTitle: 'Fourier',
        outlines: [
          { title: 'Why Decompose a Signal?', type: 'slide' },
          { title: 'Sine Wave Builder', type: 'interactive', widgetType: 'simulation' },
        ],
      }),
    );

    const quizzes = outlines.filter((outline) => outline.type === 'quiz');
    expect(quizzes).toHaveLength(1);
    // Last, so the check closes the course.
    expect(outlines[outlines.length - 1]?.type).toBe('quiz');
    // Enough questions for the completion page's topic breakdown.
    expect(quizzes[0]?.quizConfig?.questionCount).toBeGreaterThanOrEqual(6);
    // The missing second slide is added too, and order stays contiguous.
    expect(outlines.filter((outline) => outline.type === 'slide').length).toBeGreaterThanOrEqual(2);
    expect(outlines.map((outline) => outline.order)).toEqual(outlines.map((_, index) => index + 1));
  });

  it('fills in every missing type when the model returned one slide', async () => {
    const outlines = await outlinesFrom(
      JSON.stringify({
        languageDirective: 'English',
        courseTitle: 'Fourier',
        outlines: [{ title: 'Why Decompose a Signal?', type: 'slide' }],
      }),
    );

    const byType = (type: string) => outlines.filter((outline) => outline.type === type);
    expect(byType('slide').length).toBeGreaterThanOrEqual(2);
    expect(byType('interactive').length).toBeGreaterThanOrEqual(1);
    expect(byType('quiz')).toHaveLength(1);
    expect(outlines[outlines.length - 1]?.type).toBe('quiz');
    // Every interactive scene carries the two fields the content step requires.
    for (const interactive of byType('interactive')) {
      expect(interactive.widgetType).toBeTruthy();
      expect(interactive.widgetOutline).toBeTruthy();
    }
    // Ids stay unique after the additions.
    expect(new Set(outlines.map((outline) => outline.id)).size).toBe(outlines.length);
  });

  it('leaves a complete outline exactly as the model wrote it', async () => {
    const outlines = await outlinesFrom(
      JSON.stringify({
        languageDirective: 'Deutsch',
        courseTitle: 'Fourier',
        outlines: [
          { title: 'Einstieg', type: 'slide' },
          { title: 'Grundlagen', type: 'slide' },
          { title: 'Spektrum-Labor', type: 'interactive', widgetType: 'simulation' },
          {
            title: 'Wissenscheck',
            type: 'quiz',
            quizConfig: { questionCount: 8, difficulty: 'medium', questionTypes: ['single'] },
          },
        ],
      }),
    );

    expect(outlines).toHaveLength(4);
    expect(outlines.map((outline) => outline.title)).toEqual([
      'Einstieg',
      'Grundlagen',
      'Spektrum-Labor',
      'Wissenscheck',
    ]);

    const quizzes = outlines.filter((outline) => outline.type === 'quiz');
    expect(quizzes).toHaveLength(1);
    // Untouched: its own title and question count survive, in its own language.
    expect(quizzes[0]?.title).toBe('Wissenscheck');
    expect(quizzes[0]?.quizConfig?.questionCount).toBe(8);
  });
});
