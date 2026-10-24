'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Check, RotateCcw } from 'lucide-react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { SpriteFighter } from '@/teams/frontend/features/battle/SpriteFighter';
import {
  FINAL_ARENA,
  HERO,
  TOWER_LEVELS,
  villainForFloor,
} from '@/teams/frontend/features/battle/fighter-roster';
import styles from './TowerConquered.module.css';

interface TowerConqueredProps {
  dojo: Dojo;
  dojoId: string;
  onReplay: () => void;
}

/** Ending after the Sensei falls: the hero alone on the shore below Mount Fuji. */
export function TowerConquered({ dojo, dojoId, onReplay }: TowerConqueredProps) {
  return (
    <section
      className={styles.conquered}
      style={{ '--map': `url(${FINAL_ARENA.map})` } as CSSProperties}
    >
      <span className={styles.map} />
      <span className={styles.leaves} />
      <span className={styles.vignette} />

      <div className={styles.heroSlot}>
        <SpriteFighter
          art={HERO}
          motion="idle"
          kind=""
          hits={1}
          impactMs={0}
          glow
          label={HERO.name}
        />
      </div>

      <aside className={styles.panel}>
        <p className={styles.eyebrow}>
          <Check size={13} /> TOWER CONQUERED · {FINAL_ARENA.name.toUpperCase()}
        </p>
        <h1>{dojo.title} mastered.</h1>
        <p>
          {HERO.name} cleared every floor and defeated {dojo.boss.name} with questions drawn from
          the full topic.
        </p>
        <ul className={styles.defeated} aria-label="Defeated guardians">
          {TOWER_LEVELS.map((level) => {
            const villain = villainForFloor(level);
            return (
              <li key={level} style={{ '--element': villain.element } as CSSProperties}>
                <b>{level === 'boss' ? '頂' : level}</b>
                {villain.name}
              </li>
            );
          })}
        </ul>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={`/dojo/${dojoId}`}>
            View the conquered tower
          </Link>
          <button className={styles.secondaryAction} type="button" onClick={onReplay}>
            <RotateCcw size={14} /> Climb again
          </button>
        </div>
      </aside>
    </section>
  );
}
