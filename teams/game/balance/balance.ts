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

export const REACTIVE_TIMINGS = {
  block: { windupMs: 900, windowMs: 1500 },
  dodge: { windupMs: 1150, windowMs: 1200 },
  counter: { windupMs: 1350, windowMs: 900 },
} as const;
