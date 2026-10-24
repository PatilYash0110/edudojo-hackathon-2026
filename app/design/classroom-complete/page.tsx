'use client';

/**
 * Design preview for the classroom completion page: fake scenes and a fake
 * topic breakdown, so the layout and the radar can be reviewed without
 * finishing a real course. `?axes=1..8` varies the breakdown: 3 and up draw
 * the radar, 1 and 2 fall through to the per-topic bars.
 */
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ClassroomCompletePage } from '@/components/scene-renderers/classroom-complete';
import { MAX_RADAR_AXES, type InsightCategory } from '@/lib/classroom/insights';
import type { Scene } from '@/lib/types/stage';

const SAMPLE_TOPICS: InsightCategory[] = [
  { label: 'Light reactions', score: 92 },
  { label: 'Chloroplasts', score: 78 },
  { label: 'Calvin cycle', score: 64 },
  { label: 'Gas exchange', score: 55 },
  { label: 'Water transport', score: 83 },
  { label: 'Pigments', score: 71 },
  { label: 'Energy flow', score: 88 },
  { label: 'Experiments', score: 46 },
];

const scene = (id: string, type: Scene['type'], order: number): Scene =>
  ({
    id,
    stageId: 'design-preview',
    type,
    title: id,
    order,
    content:
      type === 'quiz' ? { type: 'quiz', questions: [] } : ({ type: 'slide', canvas: {} } as never),
  }) as Scene;

const SCENES: Scene[] = [
  scene('page-1', 'slide', 0),
  scene('page-2', 'slide', 1),
  scene('page-3', 'slide', 2),
  scene('quiz-1', 'quiz', 3),
  scene('game-1', 'interactive', 4),
];

function Preview() {
  const params = useSearchParams();
  const requested = Number(params.get('axes') ?? 6);
  // Below MIN_RADAR_AXES on purpose: the preview has to reach the bar
  // fallback, which is exactly the case a real course cannot be steered into.
  const axes = Math.min(MAX_RADAR_AXES, Math.max(1, Number.isFinite(requested) ? requested : 6));

  return (
    <div className="fixed inset-0">
      <ClassroomCompletePage
        scenes={SCENES}
        title="Photosynthese – Klasse 7"
        insightsOverride={SAMPLE_TOPICS.slice(0, axes)}
        quizOverride={{ correct: 19, total: 26, pct: 73 }}
      />
    </div>
  );
}

export default function ClassroomCompleteDesignPage() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
