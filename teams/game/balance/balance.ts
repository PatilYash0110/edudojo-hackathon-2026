/** Central balance values owned by Game Team. Tune these after browser playtests. */

export const BATTLE_BALANCE = {
  playerHp: 100,
  enemyHp: 120,
  enemyDamage: 24,
  heavyDamage: 34,
  comboDamagePerHit: 11,
  quizBaseDamage: 24,
  quizBonusPerAnswer: 8,
  quizBacklashDamage: 16,
  blockDamageRatio: 0.2,
  counterDamage: 14,
} as const;

export const ATTACK_COOLDOWNS = {
  heavy: 2,
  combo: 1,
  quiz: 3,
} as const;

/** Per-answer timer and mastery change reported with each grade. */
export const QUESTION_RULES = {
  answerTimeoutMs: 17000,
  masteryDeltaCorrect: 0.1,
  masteryDeltaWrong: -0.05,
} as const;

export const REACTIVE_TIMINGS = {
  block: { windupMs: 650, windowMs: 850 },
  dodge: { windupMs: 800, windowMs: 700 },
  counter: { windupMs: 950, windowMs: 550 },
} as const;
