'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FINAL_BOSS } from '@/teams/game/boss/boss-phases';
import { DEMO_DOJO } from '@/teams/game/content/demo-dojo';
import PrototypeBattle from '@/teams/frontend/features/battle/PrototypeBattle';
import { BOSS, levelFor } from '@/teams/frontend/features/battle/fighter-roster';
import { FloorEncounter } from '@/teams/frontend/features/battle/FloorEncounter';
import { useDojoProgress } from '@/teams/frontend/features/dojo-map/useDojoProgress';
import styles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';
import { TowerConquered } from './TowerConquered';

export function BossIntro() {
  const params = useParams<{ dojoId: string }>();
  const router = useRouter();
  const dojoId = params.dojoId ?? DEMO_DOJO.id;
  const { progress, ready, advance, reset } = useDojoProgress(dojoId, DEMO_DOJO.floors.length);
  const [roomEntered, setRoomEntered] = useState(false);

  const winBoss = useCallback(() => {
    advance('BOSS_DEFEATED');
  }, [advance]);

  if (!ready) return null;

  if (progress.stage === 'complete') {
    return (
      <TowerConquered
        dojoId={dojoId}
        onReplay={() => {
          reset();
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

  if (!roomEntered) {
    return (
      <FloorEncounter
        boss
        floorLabel="Final Floor · All input knowledge"
        opponent={FINAL_BOSS.name}
        opponentFighter={BOSS}
        onReady={() => setRoomEntered(true)}
      />
    );
  }

  return (
    <PrototypeBattle
      boss
      topicLabel="All English subtopics"
      opponentName={FINAL_BOSS.name}
      opponentRole="FINAL BOSS · SENSEI"
      opponentFighter={BOSS}
      arena={levelFor('boss').arena}
      onVictory={winBoss}
    />
  );
}
