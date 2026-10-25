import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../auth/session', () => ({ requireUser: vi.fn() }));
vi.mock('../guard/guard', () => ({ consumeQuota: vi.fn() }));
vi.mock('../data/db', () => ({ db: vi.fn() }));
vi.mock('../assessment/quiz', () => ({ answerQuestion: vi.fn() }));
vi.mock('../assessment/battle-grading', () => ({
  gradeTypedAnswer: vi.fn(),
  isBattleLlmGradingEnabled: vi.fn(),
}));
import { requireUser } from '../auth/session';
import { consumeQuota } from '../guard/guard';
import { gradeTypedAnswer, isBattleLlmGradingEnabled } from '../assessment/battle-grading';
import { DEMO_DOJO } from '@/teams/game/content/demo-dojo';
import { DEMO_QUESTION_BANK } from '@/teams/game/content/demo-question-bank';
import { POST } from '@/app/api/dojo/battle/answers/route';

const typed = DEMO_QUESTION_BANK.find((q) => q.answerType === 'typed')!;
function request(questionId = typed.id, answer = 'Student answer') {
  return new Request('http://localhost/api/dojo/battle/answers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      dojoId: DEMO_DOJO.id,
      questionId,
      answer,
      referenceAnswer: 'untrusted reference',
    }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({
    id: 'student',
    displayName: 'Student',
    role: 'student',
    classId: null,
    xp: 0,
  });
  vi.mocked(consumeQuota).mockResolvedValue();
  vi.mocked(isBattleLlmGradingEnabled).mockReturnValue(true);
});
describe('game-only typed answer endpoint', () => {
  it.each([1, 0.5, 0])('returns score %s using the server reference', async (score) => {
    vi.mocked(gradeTypedAnswer).mockResolvedValueOnce({ score, feedback: 'Feedback' });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).result).toMatchObject({
      score,
      correct: score === 1,
      explanation: 'Feedback',
    });
    expect(gradeTypedAnswer).toHaveBeenCalledWith(typed, 'Student answer');
  });
  it('does not consume AI quota with LLM grading disabled', async () => {
    vi.mocked(isBattleLlmGradingEnabled).mockReturnValue(false);
    vi.mocked(gradeTypedAnswer).mockResolvedValueOnce({ score: 1, feedback: 'Correct.' });
    expect((await POST(request())).status).toBe(200);
    expect(consumeQuota).not.toHaveBeenCalled();
  });
  it('rejects unknown and MCQ questions without calling the LLM', async () => {
    expect((await POST(request('missing'))).status).toBe(404);
    expect(
      (await POST(request(DEMO_QUESTION_BANK.find((q) => q.answerType === 'multiple-choice')!.id)))
        .status,
    ).toBe(404);
    expect(gradeTypedAnswer).not.toHaveBeenCalled();
  });
  it('rejects empty and oversized answers before calling the LLM', async () => {
    expect((await POST(request(typed.id, ' '))).status).toBe(400);
    expect((await POST(request(typed.id, 'x'.repeat(4001)))).status).toBe(400);
    expect(gradeTypedAnswer).not.toHaveBeenCalled();
  });
});
