/**
 * The source the app uses: the handwritten demo tower lives at `/dojo/demo`, every other dojo is a
 * Backend classroom. New dojos are always created live.
 */
import type { DojoSource } from '@/teams/shared/contracts/dojo-source';
import { createDemoSource, DEMO_DOJO_ID } from './demo-source';
import { createLiveSource } from './live-source';

export function createAppSource(
  demo: DojoSource = createDemoSource(),
  live: DojoSource = createLiveSource(),
): DojoSource {
  const pick = (dojoId: string) => (dojoId === DEMO_DOJO_ID ? demo : live);
  return {
    kind: 'live',
    createDojo: (input) => live.createDojo(input),
    // The learner's own dojos first, the demo tower last.
    listDojos: async () => [...(await live.listDojos()), ...(await demo.listDojos())],
    getDojo: (dojoId) => pick(dojoId).getDojo(dojoId),
    getStatus: (dojoId) => pick(dojoId).getStatus(dojoId),
    getQuestions: (request) => pick(request.dojoId).getQuestions(request),
    grade: (request) => pick(request.dojoId).grade(request),
  };
}
