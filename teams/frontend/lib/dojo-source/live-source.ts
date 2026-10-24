/**
 * Live DojoSource over the Backend Team's classroom API: one classroom is one dojo, each
 * classroom section is one floor, quizzes supply battle questions, answers are graded server-side.
 */
import { DOJO_API } from '@/teams/shared/contracts/api-routes';
import type {
  AnswerResult,
  Classroom,
  Quiz,
  QuizQuestion,
} from '@/teams/shared/contracts/backend-api';
import type { BattleQuestion, GradeResult } from '@/teams/shared/contracts/battle';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import type { DojoGenerationStatus, DojoSource } from '@/teams/shared/contracts/dojo-source';
import { QUESTION_RULES } from '@/teams/game/balance/balance';
import { FINAL_BOSS } from '@/teams/game/boss/boss-phases';
import { dojoFetch } from '../api-client';

/** Questions per backend quiz; every quiz is one generation call and one unit of daily quota. */
export const LIVE_QUIZ_SIZE = 5;

interface ServedQuestion {
  quizId: string;
  question: QuizQuestion;
}

export function classroomToDojo(classroom: Classroom): Dojo {
  const floors = [...classroom.floors].sort((a, b) => a.order - b.order);
  return {
    id: classroom.id,
    title: classroom.title,
    topic: classroom.prompt,
    floors: floors.map((floor, index) => ({
      id: floor.id,
      order: index + 1,
      title: floor.title,
      objectives: floor.objectives,
      challenges: [],
      ...(classroom.stageId
        ? {
            lesson: {
              runtimeId: classroom.stageId,
              sceneIds: floor.sceneIds,
              ...(classroom.playerUrl ? { playerUrl: classroom.playerUrl } : {}),
            },
          }
        : {}),
    })),
    boss: { id: 'boss', name: FINAL_BOSS.name },
  };
}

export function toBattleQuestion(quizId: string, question: QuizQuestion): BattleQuestion {
  return {
    id: `${quizId}:${question.id}`,
    objectiveId: question.objectiveId,
    prompt: question.prompt,
    answerType: question.kind === 'mcq' ? 'multiple-choice' : 'typed',
    ...(question.kind === 'mcq' ? { options: (question.options ?? []).map((o) => o.label) } : {}),
    difficulty: question.difficulty,
    timeoutMs: QUESTION_RULES.answerTimeoutMs,
  };
}

/** `getDojo` then `getStatus` on one poll share a single classroom request. */
const CLASSROOM_REUSE_MS = 1000;

export function createLiveSource(): DojoSource {
  const served = new Map<string, ServedQuestion>();
  const recent = new Map<string, { at: number; classroom: Promise<Classroom | null> }>();

  async function fetchClassroom(dojoId: string): Promise<Classroom | null> {
    try {
      const { classroom } = await dojoFetch<{ classroom: Classroom }>(DOJO_API.classroom(dojoId));
      return classroom;
    } catch (error) {
      if ((error as { code?: string }).code === 'NOT_FOUND') return null;
      throw error;
    }
  }

  function loadClassroom(dojoId: string): Promise<Classroom | null> {
    const hit = recent.get(dojoId);
    if (hit && Date.now() - hit.at < CLASSROOM_REUSE_MS) return hit.classroom;
    const classroom = fetchClassroom(dojoId);
    recent.set(dojoId, { at: Date.now(), classroom });
    classroom.catch(() => recent.delete(dojoId));
    return classroom;
  }

  return {
    kind: 'live',

    async createDojo({ topic, materialIds }) {
      const { classroom } = await dojoFetch<{ classroom: Classroom }>(DOJO_API.classrooms, {
        method: 'POST',
        body: { prompt: topic, ...(materialIds?.length ? { materialIds } : {}) },
      });
      return { dojoId: classroom.id };
    },

    async getDojo(dojoId) {
      const classroom = await loadClassroom(dojoId);
      return classroom?.status === 'ready' ? classroomToDojo(classroom) : null;
    },

    async getStatus(dojoId): Promise<DojoGenerationStatus> {
      const classroom = await loadClassroom(dojoId);
      if (!classroom) return { status: 'missing' };
      if (classroom.status === 'ready') return { status: 'ready' };
      if (classroom.status === 'failed') {
        return { status: 'failed', error: classroom.error ?? 'Generation failed.' };
      }
      return { status: 'generating', progress: classroom.progress };
    },

    async getQuestions({ dojoId, scope, count, answerType }) {
      const quizzes = Math.max(1, Math.ceil(count / LIVE_QUIZ_SIZE));
      const body = scope.kind === 'floor' ? { floorId: scope.floorId } : {};
      const results = await Promise.allSettled(
        Array.from({ length: quizzes }, () =>
          dojoFetch<{ quiz: Quiz }>(DOJO_API.quizzes(dojoId), { method: 'POST', body }),
        ),
      );
      const loaded = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value.quiz] : [],
      );
      if (loaded.length === 0) {
        const failure = results.find((result) => result.status === 'rejected');
        throw failure?.status === 'rejected' ? failure.reason : new Error('No quiz was created.');
      }
      const questions = loaded.flatMap((quiz) =>
        quiz.questions.map((question) => {
          served.set(`${quiz.id}:${question.id}`, { quizId: quiz.id, question });
          return toBattleQuestion(quiz.id, question);
        }),
      );
      return (answerType ? questions.filter((q) => q.answerType === answerType) : questions).slice(
        0,
        count,
      );
    },

    async grade({ questionId, answer }): Promise<GradeResult> {
      const entry = served.get(questionId);
      if (!entry) throw new Error(`Unknown question: ${questionId}`);
      const { quizId, question } = entry;
      const optionId =
        question.kind === 'mcq'
          ? question.options?.find((option) => option.label === answer)?.id
          : undefined;
      if (question.kind === 'mcq' && !optionId) throw new Error('That option does not exist.');

      const { result } = await dojoFetch<{ result: AnswerResult }>(DOJO_API.answer(quizId), {
        method: 'POST',
        body: optionId
          ? { questionId: question.id, optionId }
          : { questionId: question.id, text: answer },
      });
      const change = result.mastery.find((item) => item.objectiveId === question.objectiveId);
      return {
        questionId,
        objectiveId: question.objectiveId,
        correct: result.correct,
        score: result.score,
        explanation: result.correct
          ? result.explanation
          : [result.feedback, result.explanation].filter(Boolean).join(' '),
        masteryDelta: change ? change.after - change.before : 0,
      };
    },
  };
}
