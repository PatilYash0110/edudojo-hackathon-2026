'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Swords } from 'lucide-react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { ClassroomSurface } from '@/components/classroom/ClassroomSurface';
import { DojoGate } from '@/teams/frontend/app-shell/DojoGate';
import { clipUrl, HERO, levelForOrder } from '@/teams/frontend/features/battle/fighter-roster';
import { useDojoProgress } from '@/teams/frontend/features/dojo-map/useDojoProgress';
import styles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';

export function LessonPanel() {
  return <DojoGate>{(dojo, dojoId) => <LessonPanelView dojo={dojo} dojoId={dojoId} />}</DojoGate>;
}

function LessonPanelView({ dojo, dojoId }: { dojo: Dojo; dojoId: string }) {
  const params = useParams<{ floorId: string }>();
  const router = useRouter();
  const floor = dojo.floors.find((item) => item.id === params.floorId);
  const { progress, ready, advance } = useDojoProgress(dojoId, dojo.floors.length);
  const [sceneIndex, setSceneIndex] = useState(0);
  const floorOrder = floor?.order;

  // While the learner studies, fetch the battle room's art so the guardian's entrance never
  // plays in an empty room.
  useEffect(() => {
    if (!floorOrder) return;
    const { arena, villain } = levelForOrder(floorOrder);
    for (const src of [arena.map, clipUrl(HERO, 'idle'), clipUrl(villain, 'idle')]) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    }
  }, [floorOrder]);

  if (!floor) {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>UNKNOWN FLOOR</p>
        <h1>This floor does not exist.</h1>
        <Link className={styles.secondaryAction} href={`/dojo/${dojoId}`}>
          Return to tower
        </Link>
      </section>
    );
  }

  const cleared =
    progress.stage === 'boss' ||
    progress.stage === 'complete' ||
    floor.order < progress.currentFloor;
  const current = floor.order === progress.currentFloor;
  const locked = ready && floor.order > progress.currentFloor;

  if (locked) {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>FLOOR {floor.order} · LOCKED</p>
        <h1>Finish the previous floor first.</h1>
        <p>The tower only opens one subtopic at a time.</p>
        <Link className={styles.secondaryAction} href={`/dojo/${dojoId}`}>
          <ArrowLeft size={15} /> Return to tower
        </Link>
      </section>
    );
  }

  function completeLesson() {
    if (!current || progress.stage !== 'lesson') return;
    advance('LESSON_COMPLETED');
    router.push(`/dojo/${dojoId}/floor/${floor!.id}/battle`);
  }

  function continueLesson() {
    if (!floor) return;
    if (sceneIndex < floor.objectives.length - 1) {
      setSceneIndex((index) => index + 1);
      return;
    }
    completeLesson();
  }

  return (
    <section className={styles.lessonPage} aria-busy={!ready}>
      <p className={styles.eyebrow}>
        DOJO LESSON · FLOOR {floor.order} OF {dojo.floors.length}
      </p>
      <h1>{floor.title}</h1>
      <p>
        Study this section with the Sensei and your classmates. Finishing the lesson opens the
        floor&apos;s battle; winning brings you back for the next lesson.
      </p>

      {floor.lesson && (
        <div className={styles.lessonPlayer}>
          <ClassroomSurface classroomId={floor.lesson.runtimeId} variant="pane" />
        </div>
      )}
      {floor.lesson && current && progress.stage === 'lesson' && (
        <div className={styles.lessonActions}>
          <button className={styles.primaryAction} onClick={completeLesson} type="button">
            I finished this section · enter the room <Swords size={15} />
          </button>
        </div>
      )}

      {!floor.lesson && current && progress.stage === 'lesson' && (
        <div className={styles.learningEngine}>
          <BookOpen size={24} />
          <div>
            <b>Sensei&apos;s lesson</b>
            <span>
              Scene {sceneIndex + 1} of {floor.objectives.length}
            </span>
          </div>
          <div className={styles.runtimeScene}>
            <strong>{floor.objectives[sceneIndex].title}</strong>
            <p>Learn this well: the floor&apos;s guardian will test you on it.</p>
          </div>
          <button className={styles.primaryAction} onClick={continueLesson} type="button">
            {sceneIndex === floor.objectives.length - 1
              ? 'Finish the lesson · face the guardian'
              : 'Next lesson scene'}
            <BookOpen size={15} />
          </button>
        </div>
      )}

      <ul className={styles.objectiveList}>
        {floor.objectives.map((objective, index) => (
          <li key={objective.id}>
            <b>{index + 1}</b>
            <span>{objective.title}</span>
          </li>
        ))}
      </ul>

      <div className={styles.lessonActions}>
        <Link className={styles.secondaryAction} href={`/dojo/${dojoId}`}>
          <ArrowLeft size={15} /> Tower map
        </Link>
        {current && progress.stage === 'battle' ? (
          <Link className={styles.primaryAction} href={`/dojo/${dojoId}/floor/${floor.id}/battle`}>
            Continue to battle <Swords size={15} />
          </Link>
        ) : cleared ? (
          <span className={styles.clearedBadge}>Lesson reviewed</span>
        ) : null}
      </div>
    </section>
  );
}
