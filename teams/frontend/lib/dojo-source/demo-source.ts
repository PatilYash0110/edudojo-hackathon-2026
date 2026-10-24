/**
 * Offline DojoSource: serves the handwritten demo dojo and grades locally.
 * It is also the fallback whenever the live Backend source is unreachable.
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

    async createDojo() {
      // The demo cannot generate; every topic opens the handwritten tower.
      return { dojoId: dojo.id };
    },

    async listDojos() {
      return [
        {
          id: dojo.id,
          title: dojo.title,
          status: 'ready',
          progress: 100,
          floorIds: dojo.floors.map((floor) => floor.id),
        },
      ];
    },

    async getDojo(dojoId) {
      return dojoId === dojo.id ? structuredClone(dojo) : null;
    },

    async getStatus(dojoId) {
      return dojoId === dojo.id ? { status: 'ready' } : { status: 'missing' };
    },

    async getQuestions(rawRequest): Promise<BattleQuestion[]> {
      const request = QuestionRequestSchema.parse(rawRequest);
      if (request.dojoId !== dojo.id) return [];

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
      return ordered.slice(0, request.count).map(toBattleQuestion);
    },

    async grade({ dojoId, questionId, answer }: GradeRequest): Promise<GradeResult> {
      const question: DemoBankQuestion | undefined =
        dojoId === dojo.id ? bankById.get(questionId) : undefined;
      if (!question) throw new Error(`Unknown demo question: ${questionId}`);

      const correct = isDemoAnswerCorrect(question, answer);
      return {
        questionId,
        objectiveId: question.objectiveId,
        correct,
        score: correct ? 1 : 0,
        explanation: question.explanation,
        masteryDelta: correct
          ? QUESTION_RULES.masteryDeltaCorrect
          : QUESTION_RULES.masteryDeltaWrong,
      };
    },
  };
}
