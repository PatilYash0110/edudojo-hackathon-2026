'use client';

import { useEffect, useRef } from 'react';
import { HERO, type FighterArt } from './fighter-roster';
import { SpriteFighter } from './SpriteFighter';
import stageStyles from './SpriteStage.module.css';
import styles from './FloorEncounter.module.css';

export function FloorEncounter({
  floorLabel,
  opponent,
  opponentFighter,
  boss = false,
  onReady,
}: {
  floorLabel: string;
  opponent: string;
  opponentFighter: FighterArt;
  boss?: boolean;
  onReady: () => void;
}) {
  const ready = useRef(onReady);

  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const timer = setTimeout(() => ready.current(), boss ? 1250 : 900);
    return () => clearTimeout(timer);
  }, [boss]);

  return (
    <section className={styles.encounter} data-boss={boss} aria-live="polite">
      <div className={styles.room} aria-hidden="true">
        <div className={styles.backWall}>
          <span>道</span>
          <i />
          <span>場</span>
        </div>
        <div className={styles.tatami} />
        <div className={`${styles.player} ${stageStyles.paintedSlot}`}>
          <SpriteFighter art={HERO} motion="idle" kind="" hits={1} impactMs={0} bodyScale={2.6} label={HERO.name} />
        </div>
        <div className={`${styles.opponent} ${stageStyles.paintedSlot}`}>
          <SpriteFighter
            art={opponentFighter}
            motion="idle"
            kind=""
            hits={1}
            impactMs={0}
            flip
            bodyScale={2.6}
            label={opponentFighter.name}
          />
        </div>
      </div>
      <div className={styles.caption}>
        <p>{floorLabel}</p>
        <h1>{boss ? 'The Sensei transforms.' : `${opponent} enters the room.`}</h1>
        <span>Combat starts now</span>
      </div>
    </section>
  );
}
