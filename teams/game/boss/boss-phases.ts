/** Final Boss rules owned by Game Team. Backend supplies questions for each scope. */

export interface BossPhase {
  id: 1 | 2 | 3;
  title: string;
  challengeScope: 'recall' | 'application' | 'all-input-synthesis';
  description: string;
}

export const FINAL_BOSS = {
  identity: 'sensei-final-form',
  name: 'Sensei · Final Form',
  questionSource: 'all-objectives-from-user-input',
  phases: [
    {
      id: 1,
      title: 'Recall',
      challengeScope: 'recall',
      description: 'Recall key facts and vocabulary from every completed floor.',
    },
    {
      id: 2,
      title: 'Application',
      challengeScope: 'application',
      description: 'Apply knowledge from the input to new examples.',
    },
    {
      id: 3,
      title: 'Synthesis',
      challengeScope: 'all-input-synthesis',
      description: 'Combine objectives from the entire input in one final test.',
    },
  ] satisfies BossPhase[],
} as const;

export function bossPhaseFor(hpRatio: number): BossPhase {
  const ratio = Number.isFinite(hpRatio) ? Math.min(1, Math.max(0, hpRatio)) : 1;
  if (ratio > 2 / 3) return FINAL_BOSS.phases[0];
  if (ratio > 1 / 3) return FINAL_BOSS.phases[1];
  return FINAL_BOSS.phases[2];
}
