/**
 * Where a DojoLearn run or course opens in EduDojo.
 *
 * Every course here is a dojo tower, but DojoLearn's own course list knows a
 * course only by its run id and its stage id. Those are what a dojo records
 * (`DojoSummary.runId` / `.stageId`), so the list can look the tower up and
 * send a learner there instead of to `/generation-preview` or `/classroom`,
 * which are the upstream screens and carry none of the dojo.
 *
 * The run id is matched first: it exists from the moment generation starts,
 * while the stage id appears only once the course does.
 */
import type { DojoSummary } from '@/teams/shared/contracts/dojo-source';

export interface CourseIds {
  runId?: string | null;
  stageId?: string | null;
}

/** `/dojo/<id>` for the dojo behind these ids, or null when none owns them. */
export function dojoHref(dojos: readonly DojoSummary[], ids: CourseIds): string | null {
  const match = dojos.find(
    (dojo) =>
      (ids.runId != null && dojo.runId === ids.runId) ||
      (ids.stageId != null && dojo.stageId === ids.stageId),
  );
  return match ? `/dojo/${encodeURIComponent(match.id)}` : null;
}
