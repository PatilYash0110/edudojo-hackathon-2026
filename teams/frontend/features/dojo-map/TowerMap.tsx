'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, LockKeyhole, RotateCcw, Swords } from 'lucide-react';
import type { DojoProgress } from '@/teams/game/progression/unlocks';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { DojoGate } from '@/teams/frontend/app-shell/DojoGate';
import {
  CLIPS,
  clipUrl,
  HERO,
  artLevelForOrder,
  levelFor,
  levelForOrder,
  type FighterArt,
  type TowerLevel,
} from '@/teams/frontend/features/battle/fighter-roster';
import { DojoMap } from './DojoMap';
import type { RoomTheme } from './tower-rooms';
import {
  createTowerScene,
  type FloorState,
  type TowerScene,
  type TowerSprite,
} from './tower-scene';
import { useDojoProgress } from './useDojoProgress';
import styles from './TowerMap.module.css';

const THEMES: Record<TowerLevel, RoomTheme> = {
  '1': 'cage',
  '2': 'lake',
  '3': 'neon',
  '4': 'jungle',
  boss: 'lava',
};

type Stop = {
  /** Dojo floor id, or `boss`. */
  id: string;
  boss: boolean;
  badge: string;
  label: string;
  title: string;
  theme: RoomTheme;
  villain: FighterArt;
  arena: ReturnType<typeof levelFor>['arena'];
};

/** Tower storeys, bottom first: the dojo's learning floors, then the Sensei's floor. */
function buildStops(dojo: Dojo): Stop[] {
  const floors = dojo.floors.map((floor, index): Stop => {
    const order = index + 1;
    return {
      id: floor.id,
      boss: false,
      badge: String(order),
      label: `Floor ${order}`,
      title: floor.title,
      theme: THEMES[artLevelForOrder(order)],
      ...levelForOrder(order),
    };
  });
  const boss: Stop = {
    id: 'boss',
    boss: true,
    badge: '頂',
    label: 'Final floor',
    title: dojo.boss.name,
    theme: THEMES.boss,
    ...levelFor('boss'),
  };
  return [...floors, boss];
}

function idleSprite(fighter: FighterArt): TowerSprite {
  return {
    sheet: clipUrl(fighter, 'idle'),
    frames: CLIPS.idle.frames,
    fps: CLIPS.idle.fps,
    scale: fighter.scale,
    feetY: fighter.feetY,
  };
}

function floorStates(stops: Stop[], progress: DojoProgress): FloorState[] {
  const bossUnlocked = progress.stage === 'boss' || progress.stage === 'complete';
  return stops.map((stop, index): FloorState => {
    if (stop.boss) {
      if (progress.stage === 'complete') return 'cleared';
      return progress.stage === 'boss' ? 'current' : 'locked';
    }
    const order = index + 1;
    if (bossUnlocked || order < progress.currentFloor) return 'cleared';
    return order === progress.currentFloor ? 'current' : 'locked';
  });
}

const STATE_LABEL: Record<FloorState, string> = {
  locked: 'Sealed',
  current: 'Open',
  cleared: 'Cleared',
};

export function TowerMap() {
  return <DojoGate>{(dojo, dojoId) => <TowerMapView dojo={dojo} dojoId={dojoId} />}</DojoGate>;
}

function TowerMapView({ dojo, dojoId }: { dojo: Dojo; dojoId: string }) {
  const router = useRouter();
  const { progress, ready, reset } = useDojoProgress(dojoId, dojo.floors.length);
  const stops = useMemo(() => buildStops(dojo), [dojo]);
  const states = useMemo(() => floorStates(stops, progress), [stops, progress]);
  const currentIndex = states.includes('current') ? states.indexOf('current') : stops.length - 1;
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState(-1);
  const [webglFailed, setWebglFailed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const floorsRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TowerScene | null>(null);
  const pickRef = useRef<(index: number) => void>(() => {});

  const destination = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (states[index] === 'locked') return null;
      if (stop.boss) return `/dojo/${dojoId}/boss`;
      if (states[index] === 'current' && progress.stage === 'battle')
        return `/dojo/${dojoId}/floor/${stop.id}/battle`;
      return `/dojo/${dojoId}/floor/${stop.id}`;
    },
    [dojoId, progress.stage, states, stops],
  );

  const enter = useCallback(
    (index: number) => {
      const href = destination(index);
      if (href) router.push(href);
    },
    [destination, router],
  );

  useEffect(() => {
    pickRef.current = (index) => (index === selected ? enter(index) : setSelected(index));
  }, [enter, selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: TowerScene;
    try {
      scene = createTowerScene(canvas, {
        floors: stops.map((stop) => ({
          theme: stop.theme,
          map: stop.arena.small,
          villain: idleSprite(stop.villain),
        })),
        hero: idleSprite(HERO),
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onHover: (index, x, y) => {
          setHovered(index);
          const tip = tipRef.current;
          if (!tip || index < 0) return;
          tip.style.left = `${Math.min(x + 16, window.innerWidth - tip.offsetWidth - 8)}px`;
          tip.style.top = `${Math.min(y + 16, window.innerHeight - tip.offsetHeight - 8)}px`;
        },
        onPick: (index) => pickRef.current(index),
      });
    } catch {
      // No WebGL: fall back to the flat tower.
      const frame = window.requestAnimationFrame(() => setWebglFailed(true));
      return () => window.cancelAnimationFrame(frame);
    }
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [stops]);

  useEffect(() => {
    if (ready) sceneRef.current?.setStates(states);
  }, [ready, states]);

  useEffect(() => {
    sceneRef.current?.focus(selected);
  }, [selected]);

  // On narrow screens the panel and chip strip cover the bottom; frame the tower above them.
  useEffect(() => {
    const section = sectionRef.current;
    const panel = panelRef.current;
    const floors = floorsRef.current;
    if (!section || !panel || !floors) return;
    const update = () => {
      const strip = getComputedStyle(floors).flexDirection === 'row';
      const inset = strip
        ? section.getBoundingClientRect().bottom - panel.getBoundingClientRect().top + 12
        : 0;
      sceneRef.current?.setInsetBottom(inset);
    };
    const observer = new ResizeObserver(update);
    observer.observe(section);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (!ready) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)
        return;
      const last = stops.length - 1;
      if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        setSelected((index) => (index === null ? currentIndex : Math.min(last, index + 1)));
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        event.preventDefault();
        setSelected((index) => (index === null ? currentIndex : Math.max(0, index - 1)));
      } else if (event.code === 'Escape') {
        setSelected(null);
      } else if (
        event.code === 'Enter' &&
        selected !== null &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        enter(selected);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, enter, ready, selected, stops.length]);

  if (webglFailed) return <DojoMap />;

  const floorsCleared = states.filter(
    (state, index) => state === 'cleared' && !stops[index].boss,
  ).length;
  const objective =
    progress.stage === 'lesson'
      ? `Study floor ${progress.currentFloor}`
      : progress.stage === 'battle'
        ? `Defeat ${stops[progress.currentFloor - 1].villain.name}`
        : progress.stage === 'boss'
          ? `Challenge ${dojo.boss.name}`
          : 'Tower conquered';

  function actionLabel(index: number) {
    const stop = stops[index];
    const state = states[index];
    if (state === 'locked')
      return stop.boss ? 'Clear every floor first' : `Clear floor ${index} first`;
    if (stop.boss)
      return state === 'cleared' ? 'View the victory' : `Challenge ${stop.villain.name}`;
    if (state === 'cleared') return 'Review the lesson';
    return progress.stage === 'battle' ? `Fight ${stop.villain.name}` : 'Study the lesson';
  }

  function stateIcon(index: number) {
    const state = states[index];
    if (state === 'locked') return <LockKeyhole size={14} aria-label="Sealed" />;
    if (state === 'cleared') return <Check size={14} aria-label="Cleared" />;
    return stops[index].boss || progress.stage === 'battle' ? (
      <Swords size={14} aria-label="Fight" />
    ) : (
      <BookOpen size={14} aria-label="Lesson" />
    );
  }

  const stop = selected === null ? null : stops[selected];

  return (
    <section ref={sectionRef} className={styles.tower} aria-busy={!ready}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="The dojo tower: one fight room per floor, the Sensei at the top"
      />

      <header className={styles.brand}>
        <p className={styles.eyebrow}>TOPIC TOWER</p>
        <h1>{dojo.title}</h1>
        <p>{dojo.topic}</p>
      </header>

      <button
        className={styles.reset}
        type="button"
        onClick={() => {
          reset();
          setSelected(null);
        }}
      >
        <RotateCcw size={14} aria-label="Reset test progress" />
        <span className={styles.resetLabel}>Reset test progress</span>
      </button>

      <nav ref={floorsRef} className={styles.floors} aria-label="Tower floors">
        {stops.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={styles.floorChip}
            data-state={states[index]}
            data-hovered={hovered === index}
            aria-pressed={selected === index}
            style={{ '--order': index, '--rank': stops.length - index } as CSSProperties}
            onClick={() => setSelected(index)}
            onDoubleClick={() => enter(index)}
          >
            <b>{item.badge}</b>
            <span>
              <small>{item.arena.name}</small>
              {stops[index].title}
            </span>
            {stateIcon(index)}
          </button>
        ))}
      </nav>

      <aside ref={panelRef} className={styles.panel} aria-live="polite">
        {stop && selected !== null ? (
          <>
            <p className={styles.eyebrow}>
              {stop.label.toUpperCase()} · {stop.arena.name.toUpperCase()}
            </p>
            <h2>{stops[selected].title}</h2>
            <p className={styles.guardian}>
              Guardian{' '}
              <b
                style={{ color: states[selected] === 'locked' ? undefined : stop.villain.element }}
              >
                {states[selected] === 'locked' ? '???' : stop.villain.name}
              </b>
              <span className={styles.stateTag} data-state={states[selected]}>
                {stateIcon(selected)} {STATE_LABEL[states[selected]]}
              </span>
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primaryAction}
                type="button"
                disabled={!destination(selected)}
                onClick={() => enter(selected)}
              >
                {actionLabel(selected)}
              </button>
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={() => setSelected(null)}
              >
                Whole tower
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>CURRENT OBJECTIVE</p>
            <h2>{objective}</h2>
            <span className={styles.count}>
              {floorsCleared} / {dojo.floors.length} floors cleared
            </span>
            <div className={styles.progressTrack}>
              <i
                style={{
                  width: `${(states.filter((state) => state === 'cleared').length / stops.length) * 100}%`,
                }}
              />
            </div>
            <div className={styles.actions}>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={() => setSelected(currentIndex)}
              >
                Go to {stops[currentIndex].label.toLowerCase()}
              </button>
            </div>
          </>
        )}
      </aside>

      <p className={styles.hint}>
        Click a floor to look inside, click again to enter. ↑ ↓ climb · Enter go in · Esc whole
        tower
      </p>

      <div ref={tipRef} className={styles.tip} hidden={hovered < 0}>
        {hovered >= 0 && (
          <>
            {stops[hovered].label} · {stops[hovered].arena.name}{' '}
            <em>{STATE_LABEL[states[hovered]]}</em>
          </>
        )}
      </div>
    </section>
  );
}
