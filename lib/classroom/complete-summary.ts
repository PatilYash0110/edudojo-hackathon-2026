import type { Scene, SceneType, QuizContent } from '@/lib/types/stage';
import { gradeChoiceQuestions } from '@/lib/quiz/grading';

/** One graded choice question, kept so the radar can group them by topic. */
export interface QuizAnswerResult {
  questionId: string;
  sceneId: string;
  sceneTitle: string;
  question: string;
  correct: boolean;
  /**
   * What this question is worth. Course questions are worth 1; generated
   * practice is worth half (`PRACTICE_POINTS`), so drilling a weak topic
   * moves the score without letting it be farmed.
   */
  weight: number;
}

export interface CompleteSummary {
  countsByType: Partial<Record<SceneType, number>>;
  quiz: { correct: number; total: number; pct: number } | null;
  /** Empty until the async pass has read the stored answers. */
  results: QuizAnswerResult[];
}

export interface ResolvedCompleteSummary {
  scenes: Scene[];
  summary: CompleteSummary;
}

export function pendingCompleteSummary(scenes: Scene[]): CompleteSummary {
  return {
    countsByType: scenes.reduce<CompleteSummary['countsByType']>((counts, scene) => {
      counts[scene.type] = (counts[scene.type] ?? 0) + 1;
      return counts;
    }, {}),
    quiz: null,
    results: [],
  };
}

/** Never render a completed summary produced for a different scenes snapshot. */
export function completeSummaryForScenes(
  scenes: Scene[],
  resolved: ResolvedCompleteSummary,
): CompleteSummary {
  return resolved.scenes === scenes ? resolved.summary : pendingCompleteSummary(scenes);
}

export type AnswerReader = (
  sceneId: string,
) => Promise<Record<string, string | string[]> | undefined>;

type QuizAnswerLoader = (input: {
  stageId: string;
  sceneId: string;
}) => Promise<{ state?: { answers: Record<string, string | string[]> } }>;

/** Skip malformed legacy scenes before opening their RuntimeStore partition. */
export async function readSceneQuizAnswers(
  scene: { id: string; stageId?: string } | undefined,
  load: QuizAnswerLoader,
): Promise<Record<string, string | string[]> | undefined> {
  if (!scene?.stageId) return undefined;
  const { state } = await load({ stageId: scene.stageId, sceneId: scene.id });
  return state?.answers ?? {};
}

export async function summarizeScenes(
  scenes: Scene[],
  readAnswers: AnswerReader,
): Promise<CompleteSummary> {
  const countsByType: Partial<Record<SceneType, number>> = {};
  for (const scene of scenes) {
    countsByType[scene.type] = (countsByType[scene.type] ?? 0) + 1;
  }

  let correct = 0;
  let total = 0;
  const results: QuizAnswerResult[] = [];
  for (const scene of scenes) {
    if (scene.type !== 'quiz') continue;
    const questions = (scene.content as QuizContent).questions ?? [];
    let answers: Awaited<ReturnType<AnswerReader>>;
    try {
      answers = await readAnswers(scene.id);
    } catch {
      continue;
    }
    if (answers === undefined) continue;
    const graded = gradeChoiceQuestions(questions, answers);
    for (const r of graded) {
      // `earned` is already the question's points when right and 0 when
      // wrong, so the weighting costs nothing here.
      const weight = questions.find((q) => q.id === r.questionId)?.points ?? 1;
      total += weight;
      correct += r.earned;
      results.push({
        questionId: r.questionId,
        sceneId: scene.id,
        sceneTitle: scene.title ?? '',
        question: questions.find((q) => q.id === r.questionId)?.question ?? '',
        correct: r.correct === true,
        weight,
      });
    }
  }

  // Half-weight practice makes both figures fractional. The percentage is
  // computed from the exact values and only the display counts are rounded:
  // "6.5 correct answers" is not something a learner has ever been shown.
  const quiz =
    total > 0
      ? {
          correct: Math.round(correct),
          total: Math.round(total),
          pct: Math.round((correct / total) * 100),
        }
      : null;

  return { countsByType, quiz, results };
}
