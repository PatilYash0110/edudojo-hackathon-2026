'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import type { Dojo, Floor } from '@/teams/shared/contracts/dojo';
import type { GradeResult } from '@/teams/shared/contracts/battle';
import {
  byRetention,
  floorRetention,
  rematchEnemyHp,
  type ReviewAnswer,
} from '@/teams/game/mastery/decay';
import { DojoGate, DojoLoading } from '@/teams/frontend/app-shell/DojoGate';
import { useDojoProgress } from '@/teams/frontend/features/dojo-map/useDojoProgress';
import { readDojoMemory, recordReview } from '@/teams/frontend/features/dojo-map/useDojoMemory';
import flowStyles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';
import { FloorEncounter } from './FloorEncounter';
import PrototypeBattle from './PrototypeBattle';
import { levelForOrder } from './fighter-roster';

/** A decay rematch, worked out once when the page opens. */
type Rematch = { enemyHp: number; priority: string[]; retention: number };

export function BattleScreen() {
  return <DojoGate>{(dojo, dojoId) => <BattleScreenView dojo={dojo} dojoId={dojoId} />}</DojoGate>;
}

function objectiveIds(floor: Floor) {
  return floor.objectives.map((objective) => objective.id);
}

function BattleScreenView({ dojo, dojoId }: { dojo: Dojo; dojoId: string }) {
  const params = useParams<{ floorId: string }>();
  const router = useRouter();
  const floor = dojo.floors.find((item) => item.id === params.floorId);
  const nextFloor = floor ? dojo.floors[floor.order] : undefined;
  const { progress, ready, advance } = useDojoProgress(dojoId, dojo.floors.length);
  const [resolved, setResolved] = useState<'cleared' | 'repaired' | null>(null);
  const [roomEntered, setRoomEntered] = useState(false);
  /** `?review=1` asks for a rematch; read after hydration like the tower's `?floor=`. */
  const [mode, setMode] = useState<'pending' | 'normal' | 'review'>('pending');
  const [rematch, setRematch] = useState<Rematch | null>(null);
  const answers = useRef<ReviewAnswer[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const review = new URLSearchParams(window.location.search).get('review') === '1';
      if (review && floor) {
        const now = Date.now();
        const ids = objectiveIds(floor);
        const memory = readDojoMemory(dojoId);
        const retention = floorRetention(ids, memory, now) ?? 1;
        setRematch({
          enemyHp: rematchEnemyHp(retention),
          priority: byRetention(ids, memory, now),
          retention,
        });
      }
      setMode(review ? 'review' : 'normal');
    });
    return () => {
      cancelled = true;
    };
  }, [dojoId, floor]);

  const onGraded = useCallback((result: GradeResult) => {
    answers.current.push({ objectiveId: result.objectiveId, correct: result.correct });
  }, []);
  const onRestart = useCallback(() => {
    answers.current = [];
  }, []);

  const winFloor = useCallback(() => {
    if (!floor) return;
    recordReview(dojoId, objectiveIds(floor), answers.current);
    if (mode === 'review') {
      setResolved('repaired');
      return;
    }
    advance('BATTLE_WON');
    setResolved('cleared');
  }, [advance, dojoId, floor, mode]);

  useEffect(() => {
    if (!resolved || !floor) return;
    const destination =
      resolved === 'repaired'
        ? `/dojo/${dojoId}?floor=${floor.id}`
        : nextFloor
          ? `/dojo/${dojoId}/floor/${nextFloor.id}`
          : `/dojo/${dojoId}`;
    const timer = setTimeout(() => router.push(destination), 900);
    return () => clearTimeout(timer);
  }, [dojoId, floor, nextFloor, resolved, router]);

  if (!ready || mode === 'pending') return <DojoLoading />;

  if (!floor) {
    return (
      <section className={flowStyles.gate}>
        <p className={flowStyles.eyebrow}>UNKNOWN FLOOR</p>
        <h1>This battle does not exist.</h1>
        <Link className={flowStyles.secondaryAction} href={`/dojo/${dojoId}`}>
          Return to tower
        </Link>
      </section>
    );
  }

  if (resolved === 'repaired') {
    return (
      <section className={flowStyles.completion}>
        <p className={flowStyles.eyebrow}>
          <Check size={13} /> FLOOR {floor.order} REPAIRED
        </p>
        <h1>{floor.title} restored.</h1>
        <p>You remembered it again. This time it will hold longer.</p>
        <span className={flowStyles.clearedBadge}>Returning to the tower…</span>
      </section>
    );
  }

  if (resolved === 'cleared') {
    const finalUnlocked = floor.order === dojo.floors.length;
    return (
      <section className={flowStyles.completion}>
        <p className={flowStyles.eyebrow}>
          <Check size={13} /> FLOOR {floor.order} CLEARED
        </p>
        <h1>{floor.title} complete.</h1>
        <p>
          {finalUnlocked
            ? 'Every subtopic is cleared. The Sensei has transformed into the Final Boss.'
            : 'Back to the dojo: your next lesson is open.'}
        </p>
        <span className={flowStyles.clearedBadge}>Returning to the tower…</span>
      </section>
    );
  }

  const cleared =
    floor.order < progress.currentFloor ||
    progress.stage === 'boss' ||
    progress.stage === 'complete';
  const isRematch = mode === 'review' && cleared && rematch !== null;
  const canBattle =
    isRematch || (floor.order === progress.currentFloor && progress.stage === 'battle');
  if (!canBattle) {
    return (
      <section className={flowStyles.gate}>
        <p className={flowStyles.eyebrow}>BATTLE LOCKED</p>
        <h1>Finish this floor&apos;s lesson first.</h1>
        <p>The map controls which floor can be studied and fought next.</p>
        <Link className={flowStyles.secondaryAction} href={`/dojo/${dojoId}`}>
          <ArrowLeft size={15} /> Return to tower
        </Link>
      </section>
    );
  }

  const level = levelForOrder(floor.order);
  const floorLabel = isRematch
    ? `Rematch · Floor ${floor.order} · ${Math.round((rematch?.retention ?? 1) * 100)}% remembered`
    : `Floor ${floor.order} · ${floor.title}`;

  if (!roomEntered) {
    return (
      <FloorEncounter
        floorLabel={floorLabel}
        opponent={level.villain.name}
        opponentFighter={level.villain}
        arena={level.arena}
        onReady={() => setRoomEntered(true)}
      />
    );
  }

  return (
    <PrototypeBattle
      dojoId={dojoId}
      floorId={floor.id}
      topicLabel={isRematch ? `${floorLabel} · ${floor.title}` : floorLabel}
      opponentName={level.villain.name}
      opponentRole={
        isRematch ? `FLOOR ${floor.order} · RECOVERED` : `FLOOR ${floor.order} GUARDIAN`
      }
      opponentFighter={level.villain}
      arena={level.arena}
      review={isRematch}
      enemyHp={isRematch ? rematch?.enemyHp : undefined}
      objectivePriority={isRematch ? rematch?.priority : undefined}
      onGraded={onGraded}
      onRestart={onRestart}
      onVictory={winFloor}
    />
  );
}
