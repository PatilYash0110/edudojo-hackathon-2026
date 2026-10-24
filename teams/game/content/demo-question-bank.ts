/**
 * Handwritten question bank for the English Foundations demo dojo, keyed by objective.
 * Answer keys stay here; screens only ever receive `BattleQuestion` via `toBattleQuestion`.
 * Backend generation and grading replace this for live dojos.
 */
import type { BattleQuestion } from '@/teams/shared/contracts/battle';
import { QUESTION_RULES } from '../balance/balance';

export interface DemoBankQuestion {
  id: string;
  objectiveId: string;
  prompt: string;
  answerType: BattleQuestion['answerType'];
  options?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanation: string;
  difficulty: 1 | 2 | 3;
}

type Entry = Omit<DemoBankQuestion, 'objectiveId'>;

function forObjective(objectiveId: string, entries: Entry[]): DemoBankQuestion[] {
  return entries.map((entry) => ({ ...entry, objectiveId }));
}

export const DEMO_QUESTION_BANK: DemoBankQuestion[] = [
  ...forObjective('word-classes', [
    {
      id: 'wc-noun',
      answerType: 'multiple-choice',
      prompt: 'Which word is a noun?',
      options: ['happiness', 'happy', 'happily'],
      answer: 'happiness',
      explanation: '“Happiness” names a state and is a noun.',
      difficulty: 1,
    },
    {
      id: 'wc-verb',
      answerType: 'multiple-choice',
      prompt: 'Which word is a verb?',
      options: ['decide', 'decision', 'decisive'],
      answer: 'decide',
      explanation: '“Decide” is an action; “decision” is a noun and “decisive” an adjective.',
      difficulty: 1,
    },
    {
      id: 'wc-adverb',
      answerType: 'multiple-choice',
      prompt: 'In “She sings beautifully”, which word is an adverb?',
      options: ['beautifully', 'sings', 'She'],
      answer: 'beautifully',
      explanation: '“Beautifully” describes how she sings, so it is an adverb.',
      difficulty: 1,
    },
    {
      id: 'wc-adjective-typed',
      answerType: 'typed',
      prompt: 'Type the adjective in this sentence: “The tall man waved.”',
      answer: 'tall',
      explanation: '“Tall” describes the noun “man”.',
      difficulty: 2,
    },
  ]),
  ...forObjective('word-choice', [
    {
      id: 'wch-plural',
      answerType: 'multiple-choice',
      prompt: 'What is the plural of “child”?',
      options: ['children', 'childs', 'childes'],
      answer: 'children',
      explanation: '“Children” is the irregular plural of “child”.',
      difficulty: 1,
    },
    {
      id: 'wch-article',
      answerType: 'multiple-choice',
      prompt: 'Choose the correct article: I ate ___ apple.',
      options: ['an', 'a', 'the one'],
      answer: 'an',
      explanation: 'Use “an” before a vowel sound.',
      difficulty: 1,
    },
    {
      id: 'wch-adjective-form',
      answerType: 'multiple-choice',
      prompt: 'He is a very ___ driver.',
      options: ['careful', 'carefully', 'care'],
      answer: 'careful',
      explanation: 'An adjective (“careful”) describes the noun “driver”.',
      difficulty: 2,
    },
    {
      id: 'wch-comparative-typed',
      answerType: 'typed',
      prompt: 'What is the comparative form of “good”?',
      answer: 'better',
      explanation: '“Good” has the irregular comparative form “better”.',
      difficulty: 2,
    },
  ]),
  ...forObjective('word-order', [
    {
      id: 'wo-question',
      answerType: 'multiple-choice',
      prompt: 'Which question has the correct word order?',
      options: ['Where do you live?', 'Where you do live?', 'Where live you?'],
      answer: 'Where do you live?',
      explanation: 'A present-simple question uses question word + do + subject + verb.',
      difficulty: 1,
    },
    {
      id: 'wo-clause',
      answerType: 'multiple-choice',
      prompt: 'Which sentence is correct?',
      options: [
        'Although it was late, we kept working.',
        'Although was late, we kept working.',
        'Although it late was, we kept working.',
      ],
      answer: 'Although it was late, we kept working.',
      explanation: 'The clause needs the subject “it” before the verb “was”.',
      difficulty: 2,
    },
    {
      id: 'wo-adverb-position',
      answerType: 'multiple-choice',
      prompt: 'Which statement has the correct word order?',
      options: [
        'I often drink coffee in the morning.',
        'I drink often coffee in the morning.',
        'Often I coffee drink in the morning.',
      ],
      answer: 'I often drink coffee in the morning.',
      explanation: 'Frequency adverbs like “often” go before the main verb.',
      difficulty: 2,
    },
    {
      id: 'wo-build-typed',
      answerType: 'typed',
      prompt: 'Put the words in order to make a question: you / are / how',
      answer: 'how are you',
      explanation: 'Question word + verb + subject: “How are you?”',
      difficulty: 1,
    },
  ]),
  ...forObjective('agreement', [
    {
      id: 'ag-she-goes',
      answerType: 'multiple-choice',
      prompt: 'Which sentence is correct?',
      options: [
        'She goes to school every day.',
        'She go to school every day.',
        'She going to school every day.',
      ],
      answer: 'She goes to school every day.',
      explanation: 'In the simple present, “she” takes a verb ending in -s.',
      difficulty: 1,
    },
    {
      id: 'ag-plural-subject',
      answerType: 'multiple-choice',
      prompt: 'The dogs ___ loudly at night.',
      options: ['bark', 'barks', 'barking'],
      answer: 'bark',
      explanation: 'A plural subject (“the dogs”) takes the base verb form.',
      difficulty: 1,
    },
    {
      id: 'ag-everyone',
      answerType: 'multiple-choice',
      prompt: 'Everyone ___ ready for the test.',
      options: ['is', 'are', 'be'],
      answer: 'is',
      explanation: '“Everyone” is grammatically singular.',
      difficulty: 2,
    },
    {
      id: 'ag-has-typed',
      answerType: 'typed',
      prompt: 'Complete with the correct form of “have”: He ___ two brothers.',
      answer: 'has',
      explanation: 'With “he/she/it”, “have” becomes “has”.',
      difficulty: 1,
    },
  ]),
  ...forObjective('present-past', [
    {
      id: 'pp-watched',
      answerType: 'multiple-choice',
      prompt: 'Yesterday we ___ a great film.',
      options: ['watched', 'watch', 'watches'],
      answer: 'watched',
      explanation: '“Yesterday” signals the simple past: watched.',
      difficulty: 1,
    },
    {
      id: 'pp-participle',
      answerType: 'multiple-choice',
      prompt: 'What is the past participle of “write”?',
      options: ['written', 'wrote', 'writed'],
      answer: 'written',
      explanation: 'The forms are write, wrote, written.',
      difficulty: 2,
    },
    {
      id: 'pp-present-perfect',
      answerType: 'multiple-choice',
      prompt: 'Complete the present perfect: I have ___ my work.',
      options: ['finished', 'finish', 'finishing'],
      answer: 'finished',
      explanation: 'Present perfect uses have + past participle.',
      difficulty: 2,
    },
    {
      id: 'pp-went-typed',
      answerType: 'typed',
      prompt: 'What is the past tense of “go”?',
      answer: 'went',
      explanation: '“Go” is irregular: go, went, gone.',
      difficulty: 1,
    },
  ]),
  ...forObjective('future', [
    {
      id: 'fu-first-conditional',
      answerType: 'multiple-choice',
      prompt: 'Complete the sentence: If it rains, we ___ inside.',
      options: ['will stay', 'stayed', 'staying'],
      answer: 'will stay',
      explanation: 'The first conditional uses if + present, then will + verb.',
      difficulty: 2,
    },
    {
      id: 'fu-going-to',
      answerType: 'multiple-choice',
      prompt: 'Look at those dark clouds! It ___ rain.',
      options: ['is going to', 'will be', 'goes to'],
      answer: 'is going to',
      explanation: 'Use “be going to” for predictions based on what you can see now.',
      difficulty: 2,
    },
    {
      id: 'fu-arrangement',
      answerType: 'multiple-choice',
      prompt: 'I ___ my grandmother this weekend. We already booked the tickets.',
      options: ['am visiting', 'visit', 'visited'],
      answer: 'am visiting',
      explanation: 'The present continuous expresses fixed future arrangements.',
      difficulty: 2,
    },
    {
      id: 'fu-will-typed',
      answerType: 'typed',
      prompt: 'Complete the prediction with one word: I think it ___ be sunny tomorrow.',
      answer: 'will',
      explanation: '“I think” + “will” expresses an opinion about the future.',
      difficulty: 1,
    },
  ]),
  ...forObjective('meaning', [
    {
      id: 'me-opposite',
      answerType: 'multiple-choice',
      prompt: 'What is the opposite of “ancient”?',
      options: ['modern', 'quiet', 'narrow'],
      answer: 'modern',
      explanation: '“Modern” contrasts with “ancient”.',
      difficulty: 1,
    },
    {
      id: 'me-synonym',
      answerType: 'multiple-choice',
      prompt: 'Which word is closest in meaning to “quick”?',
      options: ['fast', 'heavy', 'late'],
      answer: 'fast',
      explanation: '“Fast” and “quick” can both describe high speed.',
      difficulty: 1,
    },
    {
      id: 'me-thanks-reply',
      answerType: 'multiple-choice',
      prompt: 'A friend says “Thank you!”. What is the most natural reply?',
      options: ['You’re welcome.', 'Yes, please.', 'Excuse me.'],
      answer: 'You’re welcome.',
      explanation: '“You’re welcome” is the standard reply to thanks.',
      difficulty: 1,
    },
    {
      id: 'me-bump-typed',
      answerType: 'typed',
      prompt: 'You accidentally bump into someone. Type a short polite phrase you would say.',
      answer: 'sorry',
      acceptedAnswers: ['sorry', 'excuse me', 'i am sorry', 'i’m sorry', "i'm sorry", 'pardon me'],
      explanation: '“Sorry” or “Excuse me” are natural apologies in this situation.',
      difficulty: 1,
    },
  ]),
  ...forObjective('short-response', [
    {
      id: 'sr-weekend',
      answerType: 'multiple-choice',
      prompt: 'Which reply best answers “How was your weekend?”',
      options: ['It was relaxing, thanks. I visited my family.', 'I am weekend.', 'Yes, I do.'],
      answer: 'It was relaxing, thanks. I visited my family.',
      explanation: 'A good short response answers the question and adds one detail.',
      difficulty: 1,
    },
    {
      id: 'sr-email-opening',
      answerType: 'multiple-choice',
      prompt: 'Choose the clearest opening for a short email to a teacher.',
      options: [
        'Dear Ms. Lee, I am writing to ask about the homework.',
        'Hey, homework?',
        'Lee, tell me homework.',
      ],
      answer: 'Dear Ms. Lee, I am writing to ask about the homework.',
      explanation: 'A polite greeting plus a clear purpose suits a teacher.',
      difficulty: 2,
    },
    {
      id: 'sr-help-tomorrow',
      answerType: 'multiple-choice',
      prompt: 'Which is the best short answer to “Can you help me tomorrow?”',
      options: ['Yes, I can help you after lunch.', 'Yes, I helping.', 'Tomorrow is help.'],
      answer: 'Yes, I can help you after lunch.',
      explanation: 'It answers directly with a correct verb form and a useful detail.',
      difficulty: 1,
    },
    {
      id: 'sr-polite-request-typed',
      answerType: 'typed',
      prompt: 'Complete the polite request with one word: ___ you help me, please?',
      answer: 'could',
      acceptedAnswers: ['could', 'can', 'would', 'will'],
      explanation: '“Could you…?” is a polite way to ask for help.',
      difficulty: 1,
    },
  ]),
];

export function toBattleQuestion(question: DemoBankQuestion): BattleQuestion {
  return {
    id: question.id,
    objectiveId: question.objectiveId,
    prompt: question.prompt,
    answerType: question.answerType,
    ...(question.options ? { options: [...question.options] } : {}),
    difficulty: question.difficulty,
    timeoutMs: QUESTION_RULES.answerTimeoutMs,
  };
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[’]/g, "'")
    .replace(/[.?!]+$/, '')
    .replace(/\s+/g, ' ');
}

export function isDemoAnswerCorrect(question: DemoBankQuestion, value: string): boolean {
  const given = normalizeAnswer(value);
  const accepted =
    question.answerType === 'typed' && question.acceptedAnswers
      ? question.acceptedAnswers
      : [question.answer];
  return accepted.some((answer) => normalizeAnswer(answer) === given);
}
