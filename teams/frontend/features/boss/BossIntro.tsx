'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import type { GradeResult } from '@/teams/shared/contracts/battle';
import { FINAL_BOSS } from '@/teams/game/boss/boss-phases';
import {
  byRetention,
  floorRetention,
  needsRepair,
  type ReviewAnswer,
} from '@/teams/game/mastery/decay';
import { DojoGate, DojoLoading } from '@/teams/frontend/app-shell/DojoGate';
import PrototypeBattle from '@/teams/frontend/features/battle/PrototypeBattle';
import { BOSS, levelFor } from '@/teams/frontend/features/battle/fighter-roster';
import { FloorEncounter } from '@/teams/frontend/features/battle/FloorEncounter';
import { useDojoProgress } from '@/teams/frontend/features/dojo-map/useDojoProgress';
import {
  forgetDojo,
  readDojoMemory,
  recordReview,
} from '@/teams/frontend/features/dojo-map/useDojoMemory';
import styles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';
import { TowerConquered } from './TowerConquered';

/** What the Sensei goes after: every objective, most forgotten first, and the fading floors. */
type BossFocus = { priority: string[]; fadingFloors: number[] };

export function BossIntro() {
  return <DojoGate>{(dojo, dojoId) => <BossIntroView dojo={dojo} dojoId={dojoId} />}</DojoGate>;
}

function BossIntroView({ dojo, dojoId }: { dojo: Dojo; dojoId: string }) {
  const router = useRouter();
  const { progress, ready, advance, reset } = useDojoProgress(dojoId, dojo.floors.length);
  const [roomEntered, setRoomEntered] = useState(false);
  const [focus, setFocus] = useState<BossFocus | null>(null);
  const answers = useRef<ReviewAnswer[]>([]);
  const allObjectiveIds = useMemo(
    () => dojo.floors.flatMap((floor) => floor.objectives.map((o) => o.id)),
    [dojo.floors],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const now = Date.now();
      const memory = readDojoMemory(dojoId);
      setFocus({
        priority: byRetention(allObjectiveIds, memory, now),
        fadingFloors: dojo.floors
          .filter((floor) =>
            needsRepair(
              floorRetention(
                floor.objectives.map((o) => o.id),
                memory,
                now,
              ),
            ),
          )
          .map((floor) => floor.order),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [allObjectiveIds, dojo.floors, dojoId]);

  const onGraded = useCallback((result: GradeResult) => {
    answers.current.push({ objectiveId: result.objectiveId, correct: result.correct });
  }, []);
  const onRestart = useCallback(() => {
    answers.current = [];
  }, []);

  const winBoss = useCallback(() => {
    // The final exam reviews the whole topic: every floor is refreshed.
    recordReview(dojoId, allObjectiveIds, answers.current);
    advance('BOSS_DEFEATED');
  }, [advance, allObjectiveIds, dojoId]);

  if (!ready || !focus) return <DojoLoading />;

  if (progress.stage === 'complete') {
    return (
      <TowerConquered
        dojo={dojo}
        dojoId={dojoId}
        onReplay={() => {
          reset();
          forgetDojo(dojoId);
          router.push(`/dojo/${dojoId}`);
        }}
      />
    );
  }

  if (progress.stage !== 'boss') {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>FINAL FLOOR · LOCKED</p>
        <h1>The Sensei is still teaching.</h1>
        <p>Clear every learning floor before the Final Boss appears.</p>
        <Link className={styles.secondaryAction} href={`/dojo/${dojoId}`}>
          <ArrowLeft size={15} /> Return to tower
        </Link>
      </section>
    );
  }

  const target =
    focus.fadingFloors.length > 0
      ? `The Sensei targets your fading floors: ${focus.fadingFloors.map((n) => `Floor ${n}`).join(', ')}`
      : `Every subtopic · ${dojo.title}`;

  if (!roomEntered) {
    return (
      <FloorEncounter
        boss
        floorLabel={
          focus.fadingFloors.length > 0
            ? `Final Floor · ${target}`
            : 'Final Floor · All input knowledge'
        }
        opponent={FINAL_BOSS.name}
        opponentFighter={BOSS}
        arena={levelFor('boss').arena}
        onReady={() => setRoomEntered(true)}
      />
    );
  }

  return (
    <PrototypeBattle
      boss
      dojoId={dojoId}
      topicLabel={target}
      opponentName={FINAL_BOSS.name}
      opponentRole="FINAL BOSS · SENSEI"
      opponentFighter={BOSS}
      arena={levelFor('boss').arena}
      objectivePriority={focus.priority}
      onGraded={onGraded}
      onRestart={onRestart}
      onVictory={winBoss}
    />
  );
}
