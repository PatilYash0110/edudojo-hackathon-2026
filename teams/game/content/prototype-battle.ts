import type { AttackTechnique, DefenseTechnique } from '../battle/battle-engine';

/** Handwritten German sample content. Backend owns live generation and grading. */
export interface PrototypeQuestion {
  id: string;
  kind: 'mcq' | 'typed';
  prompt: string;
  options?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanation: string;
}

export interface PrototypeChallenge {
  title: string;
  subtitle: string;
  questions: PrototypeQuestion[];
}

export const ATTACK_CHALLENGES: Record<AttackTechnique, PrototypeChallenge> = {
  heavy: {
    title: 'Schwerer Hieb',
    subtitle: 'Eine präzise Antwort lädt einen mächtigen Schwerthieb auf.',
    questions: [
      {
        id: 'heavy-greeting',
        kind: 'typed',
        prompt: 'Wie sagt man „good morning“ auf Deutsch?',
        answer: 'Guten Morgen',
        acceptedAnswers: ['guten morgen'],
        explanation: '„Guten Morgen“ ist die übliche Begrüßung am Vormittag.',
      },
    ],
  },
  combo: {
    title: 'Dreier-Kombo',
    subtitle: 'Jede richtige Antwort löst genau einen Treffer aus.',
    questions: [
      {
        id: 'combo-article',
        kind: 'mcq',
        prompt: 'Welcher Artikel gehört zu „Mädchen“?',
        options: ['das', 'die', 'der'],
        answer: 'das',
        explanation: 'Verkleinerungsformen auf -chen sind sächlich: das Mädchen.',
      },
      {
        id: 'combo-plural',
        kind: 'mcq',
        prompt: 'Wie lautet der Plural von „Buch“?',
        options: ['Bücher', 'Buche', 'Buchs'],
        answer: 'Bücher',
        explanation: 'Der Plural von „das Buch“ lautet „die Bücher“.',
      },
      {
        id: 'combo-formal',
        kind: 'mcq',
        prompt: 'Welche Begrüßung passt zu einer formellen Situation?',
        options: ['Guten Tag', 'Na?', 'Tschüss'],
        answer: 'Guten Tag',
        explanation: '„Guten Tag“ ist neutral und auch in formellen Situationen passend.',
      },
    ],
  },
  quiz: {
    title: 'Wissensstrahl',
    subtitle: 'Mindestens 3/5 Antworten halten die Energie stabil. Sonst trifft dich der Rückstoß.',
    questions: [
      {
        id: 'quiz-wohnen',
        kind: 'mcq',
        prompt: 'Ich ___ in Fulda.',
        options: ['wohne', 'wohnst', 'wohnt'],
        answer: 'wohne',
        explanation: 'Mit „ich“ bekommt das Verb „wohnen“ die Endung -e: ich wohne.',
      },
      {
        id: 'quiz-kinder',
        kind: 'mcq',
        prompt: 'Wie lautet der Plural von „Kind“?',
        options: ['Kinder', 'Kinde', 'Kinds'],
        answer: 'Kinder',
        explanation: 'Ein Kind, zwei Kinder.',
      },
      {
        id: 'quiz-weil',
        kind: 'mcq',
        prompt: 'Welches Wort bedeutet „because“?',
        options: ['weil', 'aber', 'oder'],
        answer: 'weil',
        explanation: '„Weil“ leitet einen Nebensatz ein und nennt einen Grund.',
      },
      {
        id: 'quiz-dative',
        kind: 'mcq',
        prompt: 'Welche Präposition verlangt immer den Dativ?',
        options: ['mit', 'durch', 'ohne'],
        answer: 'mit',
        explanation: 'Nach „mit“ steht immer der Dativ: mit dem Freund.',
      },
      {
        id: 'quiz-order',
        kind: 'mcq',
        prompt: 'Welcher Satz hat die richtige Wortstellung?',
        options: [
          'Heute lerne ich Deutsch.',
          'Heute ich lerne Deutsch.',
          'Heute Deutsch ich lerne.',
        ],
        answer: 'Heute lerne ich Deutsch.',
        explanation: 'Im Hauptsatz steht das konjugierte Verb an Position zwei.',
      },
    ],
  },
};

export const DEFENSE_CHALLENGES: Record<DefenseTechnique, PrototypeChallenge> = {
  block: {
    title: 'Blocken',
    subtitle: 'Eine Auswahlfrage. Erfolg reduziert den Schaden auf 20 %.',
    questions: [
      {
        id: 'block-table',
        kind: 'mcq',
        prompt: 'Welcher Artikel gehört zu „Tisch“?',
        options: ['der', 'die', 'das'],
        answer: 'der',
        explanation: 'Es heißt „der Tisch“.',
      },
    ],
  },
  counter: {
    title: 'Parade & Konter',
    subtitle: 'Beantworte beide Fragen und triff danach das enge Timing-Fenster.',
    questions: [
      {
        id: 'counter-perfect',
        kind: 'mcq',
        prompt: 'Ich habe gestern Deutsch ___.',
        options: ['gelernt', 'lernen', 'lernte'],
        answer: 'gelernt',
        explanation: 'Das Perfekt lautet: „Ich habe Deutsch gelernt.“',
      },
      {
        id: 'counter-clause',
        kind: 'mcq',
        prompt: 'Welcher Nebensatz ist richtig?',
        options: ['weil ich müde bin', 'weil ich bin müde', 'weil müde ich bin'],
        answer: 'weil ich müde bin',
        explanation: 'Im Nebensatz mit „weil“ steht das konjugierte Verb am Ende.',
      },
    ],
  },
  dodge: {
    title: 'Ausweichen',
    subtitle: 'Tippe den Ausdruck richtig. Erfolg verhindert den gesamten Schaden.',
    questions: [
      {
        id: 'dodge-thanks',
        kind: 'typed',
        prompt: 'Wie sagt man „thank you very much“ auf Deutsch?',
        answer: 'Vielen Dank',
        acceptedAnswers: ['vielen dank', 'danke schön', 'dankeschön'],
        explanation: '„Vielen Dank“ und „Danke schön“ drücken besonderen Dank aus.',
      },
    ],
  },
};

export const ENGLISH_ATTACK_CHALLENGES: Record<AttackTechnique, PrototypeChallenge> = {
  heavy: {
    title: 'Heavy Strike',
    subtitle: 'One precise answer powers one heavy slash.',
    questions: [
      {
        id: 'en-heavy-past',
        kind: 'typed',
        prompt: 'What is the past tense of “go”?',
        answer: 'went',
        acceptedAnswers: ['went'],
        explanation: '“Go” is irregular: go, went, gone.',
      },
    ],
  },
  combo: {
    title: 'Three-Hit Combo',
    subtitle: 'Each correct answer creates one hit.',
    questions: [
      {
        id: 'en-combo-agreement',
        kind: 'mcq',
        prompt: 'Which sentence is correct?',
        options: [
          'She goes to school every day.',
          'She go to school every day.',
          'She going to school every day.',
        ],
        answer: 'She goes to school every day.',
        explanation: 'In the simple present, “she” takes a verb ending in -s.',
      },
      {
        id: 'en-combo-plural',
        kind: 'mcq',
        prompt: 'What is the plural of “child”?',
        options: ['children', 'childs', 'childes'],
        answer: 'children',
        explanation: '“Children” is the irregular plural of “child”.',
      },
      {
        id: 'en-combo-article',
        kind: 'mcq',
        prompt: 'Choose the correct article: I ate ___ apple.',
        options: ['an', 'a', 'the one'],
        answer: 'an',
        explanation: 'Use “an” before a vowel sound.',
      },
    ],
  },
  quiz: {
    title: 'Knowledge Blast',
    subtitle: 'Reach at least 3/5 correct answers or take backlash damage.',
    questions: [
      {
        id: 'en-quiz-opposite',
        kind: 'mcq',
        prompt: 'What is the opposite of “ancient”?',
        options: ['modern', 'quiet', 'narrow'],
        answer: 'modern',
        explanation: '“Modern” contrasts with “ancient”.',
      },
      {
        id: 'en-quiz-participle',
        kind: 'mcq',
        prompt: 'What is the past participle of “write”?',
        options: ['written', 'wrote', 'writed'],
        answer: 'written',
        explanation: 'The forms are write, wrote, written.',
      },
      {
        id: 'en-quiz-condition',
        kind: 'mcq',
        prompt: 'Complete the sentence: If it rains, we ___ inside.',
        options: ['will stay', 'stayed', 'staying'],
        answer: 'will stay',
        explanation: 'The first conditional uses if + present, then will + verb.',
      },
      {
        id: 'en-quiz-synonym',
        kind: 'mcq',
        prompt: 'Which word is closest in meaning to “quick”?',
        options: ['fast', 'heavy', 'late'],
        answer: 'fast',
        explanation: '“Fast” and “quick” can both describe high speed.',
      },
      {
        id: 'en-quiz-order',
        kind: 'mcq',
        prompt: 'Which question has the correct word order?',
        options: ['Where do you live?', 'Where you do live?', 'Where live you?'],
        answer: 'Where do you live?',
        explanation: 'A present-simple question uses question word + do + subject + verb.',
      },
    ],
  },
};

export const ENGLISH_DEFENSE_CHALLENGES: Record<DefenseTechnique, PrototypeChallenge> = {
  block: {
    title: 'Block',
    subtitle: 'Answer once, then block during the timing window.',
    questions: [
      {
        id: 'en-block-noun',
        kind: 'mcq',
        prompt: 'Which word is a noun?',
        options: ['happiness', 'happy', 'happily'],
        answer: 'happiness',
        explanation: '“Happiness” names a state and is a noun.',
      },
    ],
  },
  counter: {
    title: 'Parry & Counter',
    subtitle: 'Answer both questions, then hit the narrow timing window.',
    questions: [
      {
        id: 'en-counter-perfect',
        kind: 'mcq',
        prompt: 'Complete the present perfect: I have ___ my work.',
        options: ['finished', 'finish', 'finishing'],
        answer: 'finished',
        explanation: 'Present perfect uses have + past participle.',
      },
      {
        id: 'en-counter-clause',
        kind: 'mcq',
        prompt: 'Which sentence is correct?',
        options: [
          'Although it was late, we kept working.',
          'Although was late, we kept working.',
          'Although it late was, we kept working.',
        ],
        answer: 'Although it was late, we kept working.',
        explanation: 'The clause needs the subject “it” before the verb “was”.',
      },
    ],
  },
  dodge: {
    title: 'Dodge',
    subtitle: 'Type one answer, then dodge during the timing window.',
    questions: [
      {
        id: 'en-dodge-comparative',
        kind: 'typed',
        prompt: 'What is the comparative form of “good”?',
        answer: 'better',
        acceptedAnswers: ['better'],
        explanation: '“Good” has the irregular comparative form “better”.',
      },
    ],
  },
};

export function isPrototypeAnswerCorrect(question: PrototypeQuestion, value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase('de-DE');
  if (question.kind === 'mcq') return normalized === question.answer.toLocaleLowerCase('de-DE');
  return (question.acceptedAnswers ?? [question.answer]).some(
    (answer) => answer.trim().toLocaleLowerCase('de-DE') === normalized,
  );
}
