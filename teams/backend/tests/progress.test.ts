import { describe, expect, it } from 'vitest';

import {
  objectiveInsights,
  revisitSuggestions,
  strengthsAndWeaknesses,
} from '@/teams/backend/analytics/compute';
import { normalizeFloors } from '@/teams/backend/generation/floors';

const scenes = ['a', 'b', 'c', 'd'].map((id) => ({ id, title: `Szene ${id}`, type: 'slide' }));

describe('floors', () => {
  it('keeps known scene ids once and numbers floors', () => {
    const floors = normalizeFloors(
      {
        floors: [
          { title: 'Eins', sceneIds: ['a', 'b', 'zzz'], objectives: ['O1'] },
          { title: 'Leer', sceneIds: ['b'], objectives: ['O2'] },
          { title: 'Zwei', sceneIds: ['c', 'd'], objectives: ['O3', 'O4'] },
        ],
      },
      scenes,
    );
    expect(floors.map((f) => [f.id, f.title, f.sceneIds])).toEqual([
      ['f1', 'Eins', ['a', 'b']],
      ['f2', 'Zwei', ['c', 'd']],
    ]);
    expect(floors[1].objectives.map((o) => o.id)).toEqual(['f2-o1', 'f2-o2']);
  });

  it('falls back to chunks of three scenes', () => {
    expect(normalizeFloors(null, scenes).map((f) => f.sceneIds)).toEqual([['a', 'b', 'c'], ['d']]);
  });
});

describe('dashboards', () => {
  const floors = normalizeFloors(null, scenes);

  it('derives strengths, weaknesses and lectures to revisit', () => {
    const insights = objectiveInsights(floors, [
      { objective_id: 'f1-o1', mastery: 0.9, attempts: 4 },
      { objective_id: 'f2-o1', mastery: 0.2, attempts: 3 },
    ]);
    expect(insights).toHaveLength(4);
    const { strengths, weaknesses } = strengthsAndWeaknesses(insights);
    expect(strengths.map((s) => s.objectiveId)).toEqual(['f1-o1']);
    expect(weaknesses.map((w) => w.objectiveId)).toEqual(['f2-o1']);
    expect(revisitSuggestions(weaknesses, '/classroom/x')).toEqual([
      { floorId: 'f2', floorTitle: 'Szene d', objectives: ['Szene d'], playerUrl: '/classroom/x' },
    ]);
  });
});
