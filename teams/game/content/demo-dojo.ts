/** Hand-written sample dojo: the client-safe fallback until Backend generation is connected. */
import type { Dojo } from '@/teams/shared/contracts/dojo';

export const DEMO_DOJO: Dojo = {
  id: 'demo',
  title: 'English Foundations',
  topic: 'Practical English from words to confident communication',
  floors: [
    {
      id: '1',
      order: 1,
      title: 'Words & Parts of Speech',
      objectives: [
        { id: 'word-classes', title: 'Identify nouns, verbs, adjectives, and adverbs' },
        { id: 'word-choice', title: 'Choose the correct word form in context' },
      ],
      challenges: [],
    },
    {
      id: '2',
      order: 2,
      title: 'Sentence Structure',
      objectives: [
        { id: 'word-order', title: 'Build statements and questions in the correct order' },
        { id: 'agreement', title: 'Apply subject–verb agreement' },
      ],
      challenges: [],
    },
    {
      id: '3',
      order: 3,
      title: 'Tenses in Context',
      objectives: [
        { id: 'present-past', title: 'Distinguish present and past actions' },
        { id: 'future', title: 'Express plans, predictions, and intentions' },
      ],
      challenges: [],
    },
    {
      id: '4',
      order: 4,
      title: 'Real Communication',
      objectives: [
        { id: 'meaning', title: 'Select natural language for everyday situations' },
        { id: 'short-response', title: 'Write a clear short response from a prompt' },
      ],
      challenges: [],
    },
  ],
  boss: { id: 'boss', name: 'Sensei · Final Form' },
};
