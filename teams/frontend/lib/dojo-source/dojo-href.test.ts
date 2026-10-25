import { describe, it, expect } from 'vitest';
import type { DojoSummary } from '@/teams/shared/contracts/dojo-source';
import { dojoHref } from './dojo-href';

const dojo = (id: string, runId: string | null, stageId: string | null): DojoSummary => ({
  id,
  title: id,
  status: stageId ? 'ready' : 'generating',
  progress: stageId ? 100 : 40,
  floorIds: [],
  runId,
  stageId,
});

const DOJOS = [
  dojo('building', 'run-new', null),
  dojo('done', 'run-old', 'stage-old'),
  dojo('demo', null, null),
];

describe('dojoHref', () => {
  it('finds the tower of a course still generating by its run', () => {
    expect(dojoHref(DOJOS, { runId: 'run-new', stageId: null })).toBe('/dojo/building');
  });

  it('finds the tower of a finished course by either id', () => {
    expect(dojoHref(DOJOS, { runId: 'run-old' })).toBe('/dojo/done');
    expect(dojoHref(DOJOS, { stageId: 'stage-old' })).toBe('/dojo/done');
  });

  it('matches nothing on an absent id, so a hand-written dojo is never hit', () => {
    // The demo dojo carries null for both: a course with no run id must not
    // collide with it and send the learner into the demo tower.
    expect(dojoHref(DOJOS, { runId: null, stageId: null })).toBeNull();
    expect(dojoHref(DOJOS, {})).toBeNull();
  });

  it('returns null for a course no dojo owns', () => {
    expect(dojoHref(DOJOS, { runId: 'run-unknown', stageId: 'stage-unknown' })).toBeNull();
  });

  it('escapes the id it puts in the path', () => {
    expect(dojoHref([dojo('a/b', 'run-x', null)], { runId: 'run-x' })).toBe('/dojo/a%2Fb');
  });
});
