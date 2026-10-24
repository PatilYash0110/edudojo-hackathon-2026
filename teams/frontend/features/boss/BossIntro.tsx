'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { FINAL_BOSS } from '@/teams/game/boss/boss-phases';
import { DojoGate } from '@/teams/frontend/app-shell/DojoGate';
import PrototypeBattle from '@/teams/frontend/features/battle/PrototypeBattle';
import { FloorEncounter } from '@/teams/frontend/features/battle/FloorEncounter';
import { useDojoProgress } from '@/teams/frontend/features/dojo-map/useDojoProgress';
import styles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';

export function BossIntro() {
  return <DojoGate>{(dojo, dojoId) => <BossIntroView dojo={dojo} dojoId={dojoId} />}</DojoGate>;
}

function BossIntroView({ dojo, dojoId }: { dojo: Dojo; dojoId: string }) {
  const { progress, ready, advance } = useDojoProgress(dojoId, dojo.floors.length);
  const [roomEntered, setRoomEntered] = useState(false);

  const winBoss = useCallback(() => {
    advance('BOSS_DEFEATED');
  }, [advance]);

  if (!ready) return null;

  if (progress.stage === 'complete') {
    return (
      <section className={styles.completion}>
        <p className={styles.eyebrow}>
          <Check size={13} /> TOPIC MASTERED
        </p>
        <h1>{dojo.title} complete.</h1>
        <p>
          The learner cleared every subtopic and defeated the Sensei using questions drawn from the
          full input.
        </p>
        <Link className={styles.primaryAction} href={`/dojo/${dojoId}`}>
          View completed tower
        </Link>
      </section>
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
      onVictory={winBoss}
    />
  );
}
