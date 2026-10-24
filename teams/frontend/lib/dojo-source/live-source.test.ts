import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Classroom, Quiz } from '@/teams/shared/contracts/backend-api';
import { BattleQuestionSchema } from '@/teams/shared/contracts/battle';
import { DojoSchema } from '@/teams/shared/contracts/dojo';
import { createAppSource } from './app-source';
import { createDemoSource } from './demo-source';
import { classroomToDojo, createLiveSource } from './live-source';

const classroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: 'c1',
  title: 'Photosynthese',
  prompt: 'Erkläre Photosynthese',
  status: 'ready',
  progress: 100,
  error: null,
  classId: null,
  stageId: 'stage-1',
  playerUrl: '/classroom/stage-1',
  floors: [
    {
      id: 'f2',
      order: 7,
      title: 'Dunkelreaktion',
      sceneIds: ['s3'],
      objectives: [{ id: 'o2', title: 'B' }],
    },
    {
      id: 'f1',
      order: 3,
      title: 'Lichtreaktion',
      sceneIds: ['s1', 's2'],
      objectives: [{ id: 'o1', title: 'A' }],
    },
  ],
  agents: [],
  createdAt: '2026-10-24T00:00:00Z',
  ...overrides,
});

const quiz: Quiz = {
  id: 'q1',
  classroomId: 'c1',
  questions: [
    {
      id: 'x1',
      kind: 'mcq',
      prompt: 'Wo?',
      options: [
        { id: 'o0', label: 'Chloroplast' },
        { id: 'o1', label: 'Kern' },
      ],
      objectiveId: 'o1',
      difficulty: 1,
    },
    { id: 'x2', kind: 'short', prompt: 'Warum?', objectiveId: 'o1', difficulty: 2 },
  ],
};

type Call = { url: string; method: string; body: unknown };

function mockFetch(routes: Record<string, (call: Call) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const call = {
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
      calls.push(call);
      const route = routes[`${call.method} ${url}`];
      const reply = route
        ? route(call)
        : { status: 404, json: { success: false, errorCode: 'NOT_FOUND', error: 'x' } };
      return new Response(JSON.stringify(reply.json), { status: reply.status ?? 200 });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('live DojoSource', () => {
  it('turns a ready classroom into a contract-valid dojo with floors in order', () => {
    const dojo = classroomToDojo(classroom());
    expect(DojoSchema.safeParse(dojo).success).toBe(true);
    expect(dojo.floors.map((f) => [f.id, f.order])).toEqual([
      ['f1', 1],
      ['f2', 2],
    ]);
    expect(dojo.floors[0].lesson).toEqual({
      runtimeId: 'stage-1',
      sceneIds: ['s1', 's2'],
      playerUrl: '/classroom/stage-1',
    });
  });

  it('reports generation progress and only returns ready dojos', async () => {
    mockFetch({
      'GET /api/dojo/classrooms/c1': () => ({
        json: { success: true, classroom: classroom({ status: 'generating', progress: 42 }) },
      }),
    });
    const source = createLiveSource();
    expect(await source.getDojo('c1')).toBeNull();
    expect(await source.getStatus('c1')).toEqual({ status: 'generating', progress: 42 });
    expect(await source.getStatus('missing')).toEqual({ status: 'missing' });
  });

  it('signs in as a guest once on UNAUTHENTICATED, then retries', async () => {
    let signedIn = false;
    const calls = mockFetch({
      'POST /api/dojo/auth/guest': () => {
        signedIn = true;
        return { status: 201, json: { success: true, user: {} } };
      },
      'POST /api/dojo/classrooms': () =>
        signedIn
          ? { status: 202, json: { success: true, classroom: classroom({ status: 'generating' }) } }
          : {
              status: 401,
              json: { success: false, errorCode: 'UNAUTHENTICATED', error: 'Bitte melde dich an.' },
            },
    });
    const result = await createLiveSource().createDojo({ topic: 'Photosynthese' });
    expect(result).toEqual({ dojoId: 'c1' });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST /api/dojo/classrooms',
      'POST /api/dojo/auth/guest',
      'POST /api/dojo/classrooms',
    ]);
    expect(calls[0].body).toEqual({ prompt: 'Photosynthese' });
  });

  it('serves quiz questions without answer keys and grades by option id or text', async () => {
    const calls = mockFetch({
      'POST /api/dojo/classrooms/c1/quizzes': () => ({
        status: 201,
        json: { success: true, quiz },
      }),
      'POST /api/dojo/quizzes/q1/answers': (call) => ({
        json: {
          success: true,
          result: {
            correct: (call.body as { optionId?: string }).optionId === 'o0',
            score: 1,
            feedback: 'Leider falsch.',
            explanation: 'Im Chloroplasten.',
            xpGained: 10,
            totalXp: 10,
            level: 1,
            mastery: [{ objectiveId: 'o1', before: 0.2, after: 0.5, status: 'learning' }],
          },
        },
      }),
    });
    const source = createLiveSource();
    const questions = await source.getQuestions({
      dojoId: 'c1',
      scope: { kind: 'floor', floorId: 'f1' },
      count: 5,
    });
    expect(calls[0].body).toEqual({ floorId: 'f1' });
    expect(questions.map((q) => [q.id, q.answerType])).toEqual([
      ['q1:x1', 'multiple-choice'],
      ['q1:x2', 'typed'],
    ]);
    for (const q of questions) expect(BattleQuestionSchema.safeParse(q).success).toBe(true);
    expect(questions[0].options).toEqual(['Chloroplast', 'Kern']);

    const right = await source.grade({ dojoId: 'c1', questionId: 'q1:x1', answer: 'Chloroplast' });
    expect(calls.at(-1)?.body).toEqual({ questionId: 'x1', optionId: 'o0' });
    expect(right).toMatchObject({
      correct: true,
      objectiveId: 'o1',
      explanation: 'Im Chloroplasten.',
    });
    expect(right.masteryDelta).toBeCloseTo(0.3);

    const wrong = await source.grade({ dojoId: 'c1', questionId: 'q1:x1', answer: 'Kern' });
    expect(wrong.explanation).toBe('Leider falsch. Im Chloroplasten.');

    await source.grade({ dojoId: 'c1', questionId: 'q1:x2', answer: 'Licht' });
    expect(calls.at(-1)?.body).toEqual({ questionId: 'x2', text: 'Licht' });
  });

  it('asks one quiz per five questions and omits the floor for the boss', async () => {
    const calls = mockFetch({
      'POST /api/dojo/classrooms/c1/quizzes': () => ({
        status: 201,
        json: { success: true, quiz },
      }),
    });
    await createLiveSource().getQuestions({ dojoId: 'c1', scope: { kind: 'boss' }, count: 10 });
    expect(calls).toHaveLength(2);
    expect(calls[0].body).toEqual({});
  });
});

describe('app DojoSource', () => {
  it('routes the demo id to the demo source and everything else to live', async () => {
    mockFetch({});
    const source = createAppSource(createDemoSource(), createLiveSource());
    expect((await source.getDojo('demo'))?.title).toBe('English Foundations');
    expect(await source.getStatus('demo')).toEqual({ status: 'ready' });
    expect(await source.getStatus('other')).toEqual({ status: 'missing' });
  });
});
