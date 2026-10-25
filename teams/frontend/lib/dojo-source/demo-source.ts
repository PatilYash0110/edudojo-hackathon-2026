import { dojoFetch } from '../api-client';
/**
 * Serves the handwritten demo dojo. MCQs grade locally; typed answers use server AI grading.
 */
import {
  type BattleQuestion,
  type GradeRequest,
  type GradeResult,
  type QuestionRequest,
  QuestionRequestSchema,
} from '@/teams/shared/contracts/battle';
import { type Dojo, DojoSchema } from '@/teams/shared/contracts/dojo';
import type { DojoSource } from '@/teams/shared/contracts/dojo-source';
import { QUESTION_RULES } from '@/teams/game/balance/balance';
import { DEMO_DOJO } from '@/teams/game/content/demo-dojo';
import {
  type DemoBankQuestion,
  DEMO_QUESTION_BANK,
  isDemoAnswerCorrect,
  toBattleQuestion,
} from '@/teams/game/content/demo-question-bank';

export const DEMO_DOJO_ID = DEMO_DOJO.id;

export interface DemoSourceOptions {
  /** Returns a number in [0, 1). Injected by tests for deterministic order. */
  random?: () => number;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDemoSource(options: DemoSourceOptions = {}): DojoSource {
  const random = options.random ?? Math.random;
  const dojo: Dojo = DojoSchema.parse(DEMO_DOJO);
  const bankById = new Map(DEMO_QUESTION_BANK.map((question) => [question.id, question]));

  function objectiveIdsFor(request: QuestionRequest): Set<string> {
    if (request.scope.kind === 'boss') {
      return new Set(dojo.floors.flatMap((floor) => floor.objectives.map((o) => o.id)));
    }
    const { floorId } = request.scope;
    const floor = dojo.floors.find((item) => item.id === floorId);
    return new Set(floor?.objectives.map((o) => o.id) ?? []);
  }

  return {
    kind: 'demo',

    createDojo() {
      // The demo cannot generate; every topic opens the handwritten tower.
      return Promise.resolve({ dojoId: dojo.id });
    },

    listDojos() {
      return Promise.resolve([
        {
          id: dojo.id,
          title: dojo.title,
          status: 'ready' as const,
          progress: 100,
          floorIds: dojo.floors.map((floor) => floor.id),
          // Hand-written, never generated: there is no run and no course.
          runId: null,
          stageId: null,
        },
      ]);
    },

    getDojo(dojoId) {
      return Promise.resolve(dojoId === dojo.id ? structuredClone(dojo) : null);
    },

    getStatus(dojoId) {
      return Promise.resolve(
        dojoId === dojo.id ? { status: 'ready' as const } : { status: 'missing' as const },
      );
    },

    getQuestions(rawRequest): Promise<BattleQuestion[]> {
      const parsed = QuestionRequestSchema.safeParse(rawRequest);
      if (!parsed.success) return Promise.reject(parsed.error);
      const request = parsed.data;
      if (request.dojoId !== dojo.id) return Promise.resolve([]);

      const objectives = objectiveIdsFor(request);
      const pool = DEMO_QUESTION_BANK.filter(
        (question) =>
          objectives.has(question.objectiveId) &&
          (!request.answerType || question.answerType === request.answerType),
      );
      const excluded = new Set(request.excludeIds ?? []);
      const fresh = pool.filter((question) => !excluded.has(question.id));
      const reused = pool.filter((question) => excluded.has(question.id));
      // Prefer unseen questions, then fall back to repeats so a battle never runs dry.
      const ordered = [...shuffled(fresh, random), ...shuffled(reused, random)];
      return Promise.resolve(ordered.slice(0, request.count).map(toBattleQuestion));
    },

    grade({ dojoId, questionId, answer }: GradeRequest): Promise<GradeResult> {
      const question: DemoBankQuestion | undefined =
        dojoId === dojo.id ? bankById.get(questionId) : undefined;
      if (!question) return Promise.reject(new Error(`Unknown demo question: ${questionId}`));

      if (question.answerType === 'typed') {
        return dojoFetch<{ result: GradeResult }>('/api/dojo/battle/answers', {
          method: 'POST',
          body: { dojoId, questionId, answer },
        }).then(({ result }) => result);
      }

      const correct = isDemoAnswerCorrect(question, answer);
      return Promise.resolve({
        questionId,
        objectiveId: question.objectiveId,
        correct,
        score: correct ? 1 : 0,
        explanation: question.explanation,
        masteryDelta: correct
          ? QUESTION_RULES.masteryDeltaCorrect
          : QUESTION_RULES.masteryDeltaWrong,
      });
    },
  };
}
