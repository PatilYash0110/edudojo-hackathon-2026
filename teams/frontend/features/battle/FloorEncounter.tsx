'use client';

import { useEffect, useRef } from 'react';
import styles from './FloorEncounter.module.css';

export function FloorEncounter({
  floorLabel,
  opponent,
  boss = false,
  onReady,
}: {
  floorLabel: string;
  opponent: string;
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
    // `dark`: the cutscene leads straight into the always-dark battle arena.
    <section className={`dark ${styles.encounter}`} data-boss={boss} aria-live="polite">
      <div className={styles.room} aria-hidden="true">
        <div className={styles.backWall}>
          <span>道</span>
          <i />
          <span>場</span>
        </div>
        <div className={styles.tatami} />
        <div className={styles.player} />
        <div className={styles.opponent} />
      </div>
      <div className={styles.caption}>
        <p>{floorLabel}</p>
        <h1>{boss ? 'The Sensei transforms.' : `${opponent} enters the room.`}</h1>
        <span>Combat starts now</span>
      </div>
    </section>
  );
}
