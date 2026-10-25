/**
 * Pure dashboard math: mastery rows + floors → insights, strengths,
 * weaknesses, lectures to revisit. OWNER: BACKEND TEAM.
 */
import { masteryStatus, NEEDS_REVIEW_BELOW } from '@/teams/game/mastery/mastery-rules';
import type {
  Floor,
  ObjectiveInsight,
  RevisitSuggestion,
} from '@/teams/shared/contracts/backend-api';

export interface MasteryRow {
  objective_id: string;
  mastery: number;
  attempts: number;
}

export function objectiveInsights(floors: Floor[], rows: MasteryRow[]): ObjectiveInsight[] {
  const byId = new Map(rows.map((row) => [row.objective_id, row]));
  return floors.flatMap((floor) =>
    floor.objectives.map((objective) => {
      const row = byId.get(objective.id);
      const mastery = row?.mastery ?? 0;
      const attempts = row?.attempts ?? 0;
      return {
        objectiveId: objective.id,
        title: objective.title,
        floorId: floor.id,
        floorTitle: floor.title,
        mastery,
        status: masteryStatus(mastery, attempts),
        attempts,
      };
    }),
  );
}

export function strengthsAndWeaknesses(insights: ObjectiveInsight[]) {
  const tried = insights.filter((insight) => insight.attempts > 0);
  return {
    strengths: tried
      .filter((i) => i.status === 'mastered')
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 3),
    weaknesses: tried
      .filter((i) => i.mastery < NEEDS_REVIEW_BELOW)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3),
  };
}

/** One suggestion per floor that holds a weak objective. */
export function revisitSuggestions(
  weak: { floorId: string; floorTitle: string; title: string }[],
  playerUrl: string | null,
): RevisitSuggestion[] {
  const byFloor = new Map<string, RevisitSuggestion>();
  for (const item of weak) {
    const entry = byFloor.get(item.floorId) ?? {
      floorId: item.floorId,
      floorTitle: item.floorTitle,
      objectives: [],
      playerUrl,
    };
    entry.objectives.push(item.title);
    byFloor.set(item.floorId, entry);
  }
  return [...byFloor.values()];
}
