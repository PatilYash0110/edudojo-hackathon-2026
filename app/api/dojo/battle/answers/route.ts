import { z } from 'zod';
import { DojoError, handle, ok, readBody } from '@/teams/backend/api/http';
import { requireUser } from '@/teams/backend/auth/session';
import { consumeQuota } from '@/teams/backend/guard/guard';
import { answerQuestion } from '@/teams/backend/assessment/quiz';
import { db } from '@/teams/backend/data/db';
import { DEMO_DOJO } from '@/teams/game/content/demo-dojo';
import { DEMO_QUESTION_BANK } from '@/teams/game/content/demo-question-bank';
import {
  gradeTypedAnswer,
  isBattleLlmGradingEnabled,
} from '@/teams/backend/assessment/battle-grading';
import { QUESTION_RULES } from '@/teams/game/balance/balance';

const Body = z.object({
  dojoId: z.string().min(1),
  questionId: z.string().min(1),
  answer: z.string().trim().min(1).max(4000),
});

export function POST(req: Request) {
  return handle(async () => {
    const input = await readBody(req, Body);
    const user = await requireUser(req);
    let question;
    let liveQuizId: string | undefined;
    let liveQuestionId: string | undefined;
    if (input.dojoId === DEMO_DOJO.id) {
      question = DEMO_QUESTION_BANK.find(
        (q) => q.id === input.questionId && q.answerType === 'typed',
      );
    } else {
      const separator = input.questionId.lastIndexOf(':');
      const quizId = input.questionId.slice(0, separator);
      const questionId = input.questionId.slice(separator + 1);
      liveQuizId = quizId;
      liveQuestionId = questionId;
      const pool = await db();
      const { rows } = await pool.query<{
        questions: {
          id: string;
          kind: string;
          objectiveId: string;
          prompt: string;
          sampleAnswer: string;
          rubric?: string;
          explanation: string;
        }[];
      }>(
        'SELECT questions FROM dojo_quizzes WHERE id = $1 AND user_id = $2 AND classroom_id = $3',
        [quizId, user.id, input.dojoId],
      );
      const stored = rows[0]?.questions.find((q) => q.id === questionId && q.kind === 'short');
      if (stored)
        question = {
          ...stored,
          answer: stored.sampleAnswer,
          explanation: [stored.rubric, stored.explanation].filter(Boolean).join(' '),
        };
    }
    if (!question) throw new DojoError('NOT_FOUND', 'Battle question not found.');
    if (isBattleLlmGradingEnabled()) await consumeQuota(user, 'quiz');
    const { score, feedback } = await gradeTypedAnswer(question, input.answer);
    if (liveQuizId && liveQuestionId) {
      const saved = await answerQuestion(
        user,
        liveQuizId,
        { questionId: liveQuestionId, text: input.answer },
        { score, feedback },
      );
      const change = saved.mastery.find((item) => item.objectiveId === question.objectiveId);
      return ok({
        result: {
          questionId: input.questionId,
          objectiveId: question.objectiveId,
          correct: score === 1,
          score,
          explanation: feedback,
          masteryDelta: change ? change.after - change.before : 0,
        },
      });
    }
    return ok({
      result: {
        questionId: input.questionId,
        objectiveId: question.objectiveId,
        correct: score === 1,
        score,
        explanation: feedback,
        masteryDelta:
          score === 1
            ? QUESTION_RULES.masteryDeltaCorrect
            : score === 0
              ? QUESTION_RULES.masteryDeltaWrong
              : 0,
      },
    });
  });
}
