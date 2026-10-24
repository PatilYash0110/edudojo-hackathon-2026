'use client';

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LockKeyhole,
  RotateCcw,
} from 'lucide-react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { DojoGate } from '@/teams/frontend/app-shell/DojoGate';
import { useDojoProgress } from './useDojoProgress';
import styles from './DojoFlow.module.css';

export function DojoMap() {
  return <DojoGate>{(dojo, dojoId) => <DojoMapView dojo={dojo} dojoId={dojoId} />}</DojoGate>;
}

function DojoMapView({ dojo, dojoId }: { dojo: Dojo; dojoId: string }) {
  const router = useRouter();
  const { progress, ready, reset } = useDojoProgress(dojoId, dojo.floors.length);
  const floors = [...dojo.floors].reverse();
  const bossUnlocked = progress.stage === 'boss' || progress.stage === 'complete';
  const bossLevel = dojo.floors.length + 1;
  const highestLevel = bossLevel;
  const [selectedLevel, setSelectedLevel] = useState(progress.currentFloor);
  const [playerX, setPlayerX] = useState(18);
  const enteringDoor = useRef(false);
  const atDoor = playerX >= 78;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedLevel(bossUnlocked ? bossLevel : progress.currentFloor);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bossLevel, bossUnlocked, progress.currentFloor]);

  const move = useCallback(
    (direction: -1 | 1) => {
      setSelectedLevel((level) => Math.min(highestLevel, Math.max(1, level + direction)));
      setPlayerX(18);
      enteringDoor.current = false;
    },
    [highestLevel],
  );

  const walk = useCallback((direction: -1 | 1) => {
    setPlayerX((position) => Math.min(82, Math.max(10, position + direction * 8)));
  }, []);

  const enterSelected = useCallback(() => {
    if (!atDoor || enteringDoor.current) return;
    if (selectedLevel === bossLevel) {
      if (bossUnlocked) {
        enteringDoor.current = true;
        router.push(`/dojo/${dojoId}/boss`);
      }
      return;
    }
    if (selectedLevel > progress.currentFloor) return;
    const selectedFloor = dojo.floors[selectedLevel - 1];
    const destination =
      selectedLevel === progress.currentFloor && progress.stage === 'battle'
        ? `/dojo/${dojoId}/floor/${selectedFloor.id}/battle`
        : `/dojo/${dojoId}/floor/${selectedFloor.id}`;
    enteringDoor.current = true;
    router.push(destination);
  }, [
    bossLevel,
    bossUnlocked,
    dojo.floors,
    dojoId,
    progress.currentFloor,
    progress.stage,
    router,
    selectedLevel,
    atDoor,
  ]);

  useEffect(() => {
    if (atDoor) enterSelected();
  }, [atDoor, enterSelected]);

  useEffect(() => {
    function handleMovement(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement
      )
        return;
      if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        move(1);
      }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        move(-1);
      }
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        event.preventDefault();
        walk(-1);
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        event.preventDefault();
        walk(1);
      }
    }
    window.addEventListener('keydown', handleMovement);
    return () => window.removeEventListener('keydown', handleMovement);
  }, [move, walk]);

  const nextAction =
    progress.stage === 'lesson'
      ? `Study floor ${progress.currentFloor}`
      : progress.stage === 'battle'
        ? `Fight on floor ${progress.currentFloor}`
        : progress.stage === 'boss'
          ? 'Challenge the Sensei'
          : 'Topic mastered';

  return (
    <section className={styles.page} aria-busy={!ready}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>TOPIC TOWER</p>
          <h1>{dojo.title}</h1>
          <p>{dojo.topic}</p>
        </div>
        <button
          className={styles.reset}
          onClick={() => {
            reset();
            setSelectedLevel(1);
            setPlayerX(18);
          }}
          type="button"
        >
          <RotateCcw size={15} /> Reset test progress
        </button>
      </header>

      <div className={styles.loop} aria-label="Learning loop">
        <span>Learn with Sensei</span>
        <b>→</b>
        <span>Fight on the floor</span>
        <b>→</b>
        <span>Return and learn</span>
        <b>→</b>
        <span>Final Boss</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.tower} aria-label="Walkable tower cross-section">
          <article
            className={styles.bossFloor}
            data-status={progress.stage}
            data-selected={selectedLevel === bossLevel}
            onClick={() => {
              setSelectedLevel(bossLevel);
              setPlayerX(18);
              enteringDoor.current = false;
            }}
          >
            {selectedLevel === bossLevel && (
              <span
                className={styles.mapPlayer}
                aria-label="Player"
                style={{ '--player-x': `${playerX}%` } as CSSProperties}
              />
            )}
            <div className={styles.floorNumber}>頂</div>
            <div>
              <p>FINAL FLOOR · ALL SUBTOPICS</p>
              <h2>{dojo.boss.name}</h2>
              <small>Recall → Application → Synthesis</small>
            </div>
            {progress.stage === 'complete' ? (
              <span className={styles.clearedBadge}>
                <Check size={14} /> MASTERED
              </span>
            ) : bossUnlocked ? (
              <span className={styles.doorBadge}>BOSS DOOR</span>
            ) : (
              <span className={styles.lockedBadge}>
                <LockKeyhole size={14} /> Clear all floors
              </span>
            )}
          </article>

          {floors.map((floor) => {
            const cleared =
              progress.stage === 'boss' ||
              progress.stage === 'complete' ||
              floor.order < progress.currentFloor;
            const current = floor.order === progress.currentFloor && !bossUnlocked;
            return (
              <article
                className={styles.floor}
                data-status={cleared ? 'cleared' : current ? progress.stage : 'locked'}
                data-selected={selectedLevel === floor.order}
                key={floor.id}
                onClick={() => {
                  setSelectedLevel(floor.order);
                  setPlayerX(18);
                  enteringDoor.current = false;
                }}
              >
                {selectedLevel === floor.order && (
                  <span
                    className={styles.mapPlayer}
                    aria-label="Player"
                    style={{ '--player-x': `${playerX}%` } as CSSProperties}
                  />
                )}
                <div className={styles.floorNumber}>{floor.order}</div>
                <div>
                  <p>FLOOR {floor.order}</p>
                  <h2>{floor.title}</h2>
                  <small>{floor.objectives.length} learning objectives</small>
                </div>
                {cleared ? (
                  <span className={styles.clearedBadge}>
                    <Check size={14} /> CLEARED
                  </span>
                ) : current ? (
                  <span className={styles.doorBadge}>
                    {progress.stage === 'lesson' ? 'LESSON DOOR' : 'BATTLE DOOR'}
                  </span>
                ) : (
                  <span className={styles.lockedBadge}>
                    <LockKeyhole size={14} /> LOCKED
                  </span>
                )}
              </article>
            );
          })}
        </div>

        <aside className={styles.statusPanel}>
          <p className={styles.eyebrow}>CURRENT OBJECTIVE</p>
          <strong>{nextAction}</strong>
          <span>
            {Math.min(progress.currentFloor - 1, dojo.floors.length)} / {dojo.floors.length} floors
            cleared
          </span>
          <div className={styles.progressTrack}>
            <i
              style={{
                width: `${
                  ((progress.stage === 'complete'
                    ? dojo.floors.length + 1
                    : progress.stage === 'boss'
                      ? dojo.floors.length
                      : progress.currentFloor - 1) /
                    (dojo.floors.length + 1)) *
                  100
                }%`,
              }}
            />
          </div>
          <p>
            A floor unlocks only after its lesson. Winning sends the learner back to the Dojo before
            the next floor opens.
          </p>
          <div className={styles.mapControls}>
            <p className={styles.eyebrow}>MOVE IN THE TOWER</p>
            <div>
              <button onClick={() => move(1)} disabled={selectedLevel >= highestLevel}>
                <ChevronUp size={16} /> W / ↑
              </button>
              <button onClick={() => move(-1)} disabled={selectedLevel <= 1}>
                <ChevronDown size={16} /> S / ↓
              </button>
            </div>
            <div>
              <button onClick={() => walk(-1)} disabled={playerX <= 10}>
                <ChevronLeft size={16} /> A / ←
              </button>
              <button onClick={() => walk(1)} disabled={playerX >= 82}>
                <ChevronRight size={16} /> D / →
              </button>
            </div>
            <p className={styles.autoDoorHint}>Walk into an open door to enter automatically.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
