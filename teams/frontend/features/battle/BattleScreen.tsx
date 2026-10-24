'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { DEMO_DOJO } from '@/teams/game/content/demo-dojo';
import { useDojoProgress } from '@/teams/frontend/features/dojo-map/useDojoProgress';
import flowStyles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';
import { FloorEncounter } from './FloorEncounter';
import PrototypeBattle from './PrototypeBattle';

export function BattleScreen() {
  const params = useParams<{ dojoId: string; floorId: string }>();
  const router = useRouter();
  const dojoId = params.dojoId ?? DEMO_DOJO.id;
  const floor = DEMO_DOJO.floors.find((item) => item.id === params.floorId);
  const nextFloor = floor ? DEMO_DOJO.floors[floor.order] : undefined;
  const { progress, ready, advance } = useDojoProgress(dojoId, DEMO_DOJO.floors.length);
  const [resolved, setResolved] = useState(false);
  const [roomEntered, setRoomEntered] = useState(false);

  const winFloor = useCallback(() => {
    advance('BATTLE_WON');
    setResolved(true);
  }, [advance]);

  useEffect(() => {
    if (!resolved) return;
    const destination = nextFloor ? `/dojo/${dojoId}/floor/${nextFloor.id}` : `/dojo/${dojoId}`;
    const timer = setTimeout(() => router.push(destination), 900);
    return () => clearTimeout(timer);
  }, [dojoId, nextFloor, resolved, router]);

  if (!ready) return null;

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

  if (resolved) {
    const finalUnlocked = floor.order === DEMO_DOJO.floors.length;
    return (
      <section className={flowStyles.completion}>
        <p className={flowStyles.eyebrow}>
          <Check size={13} /> FLOOR {floor.order} CLEARED
        </p>
        <h1>{floor.title} complete.</h1>
        <p>
          {finalUnlocked
            ? 'Every subtopic is cleared. The Sensei has transformed into the Final Boss.'
            : 'Return to the Dojo. The next OpenMAIC learning section is now available.'}
        </p>
        <span className={flowStyles.clearedBadge}>Returning to the tower…</span>
      </section>
    );
  }

  const canBattle = floor.order === progress.currentFloor && progress.stage === 'battle';
  if (!canBattle) {
    return (
      <section className={flowStyles.gate}>
        <p className={flowStyles.eyebrow}>BATTLE LOCKED</p>
        <h1>Complete the current OpenMAIC lesson first.</h1>
        <p>The map controls which floor can be studied and fought next.</p>
        <Link className={flowStyles.secondaryAction} href={`/dojo/${dojoId}`}>
          <ArrowLeft size={15} /> Return to tower
        </Link>
      </section>
    );
  }

  if (!roomEntered) {
    return (
      <FloorEncounter
        floorLabel={`Floor ${floor.order} · ${floor.title}`}
        opponent={`Floor ${floor.order} Guardian`}
        onReady={() => setRoomEntered(true)}
      />
    );
  }

  return (
    <PrototypeBattle
      topicLabel={`Floor ${floor.order} · ${floor.title}`}
      opponentName={`Floor ${floor.order} Guardian`}
      onVictory={winFloor}
    />
  );
}
