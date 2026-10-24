'use client';

import { type CSSProperties, useEffect, useRef } from 'react';
import { CLIPS, clipUrl, type ClipName, type FighterArt } from './fighter-roster';
import styles from './SpriteFighter.module.css';

/** The same motion names PrototypeBattle puts on each actor's `data-motion`. */
export type FighterMotion =
  | 'idle'
  | 'faceoff'
  | 'lunge'
  | 'hurt'
  | 'evade'
  | 'charge'
  | 'windup'
  | 'victory'
  | 'defeat';

interface SpriteFighterProps {
  art: FighterArt;
  motion: FighterMotion;
  /** `fx.kind` of the current action, or '' when nothing is playing. */
  kind: string;
  hits: number;
  impactMs: number;
  flip?: boolean;
  /** Ember glow for the Dragon Fang equipment. */
  glow?: boolean;
  /** Character height as a fraction of the slot height. */
  bodyScale?: number;
  label: string;
}

interface Segment {
  at: number;
  clip: ClipName;
}

/** Body acting layered over the clips. Units: % of the frame, degrees, 0–1. */
interface Pose {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  flash: number;
  gray: number;
  aura: number;
  ghost: number;
  burst: number;
}

const COMBO_FIRST_HIT_MS = 360;
const COMBO_HIT_GAP_MS = 180;
const ease = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function comboTimes(hits: number) {
  return Array.from(
    { length: Math.max(1, hits) },
    (_, i) => COMBO_FIRST_HIT_MS + i * COMBO_HIT_GAP_MS,
  );
}

function clipMs(clip: ClipName) {
  return (CLIPS[clip].frames / CLIPS[clip].fps) * 1000;
}

/** Start a clip early enough that its contact frame lands at `contactMs`. */
function strikeAt(clip: ClipName, contactMs: number): Segment {
  const spec = CLIPS[clip];
  return { at: Math.max(0, contactMs - ((spec.contact + 0.5) / spec.fps) * 1000), clip };
}

function withIdleAfter(segments: Segment[]): Segment[] {
  const last = segments[segments.length - 1];
  return [...segments, { at: last.at + clipMs(last.clip), clip: 'idle' }];
}

function timeline(motion: FighterMotion, kind: string, hits: number, impactMs: number): Segment[] {
  const idle: Segment = { at: 0, clip: 'idle' };
  switch (motion) {
    case 'lunge':
      if (kind === 'combo')
        return withIdleAfter([idle, ...comboTimes(hits).map((t) => strikeAt('jab', t))]);
      return withIdleAfter([idle, strikeAt(kind === 'counter' ? 'jab' : 'heavy', impactMs)]);
    case 'charge':
      return withIdleAfter([idle, strikeAt('special', impactMs)]);
    case 'hurt':
      if (kind === 'block') return withIdleAfter([idle, strikeAt('block', impactMs)]);
      return withIdleAfter([
        idle,
        ...(kind === 'combo' ? comboTimes(hits) : [impactMs]).map(
          (at): Segment => ({ at, clip: 'hurt' }),
        ),
      ]);
    case 'evade':
      return withIdleAfter([idle, { at: 80, clip: 'block' }]);
    case 'defeat':
      return [{ at: 0, clip: 'hurt' }];
    default:
      return [idle];
  }
}

function restPose(): Pose {
  return { x: 0, y: 0, rot: 0, sx: 1, sy: 1, flash: 0, gray: 0, aura: 0, ghost: 0, burst: -1 };
}

/** Wind-up, lunge and follow-through around a contact at t = 0 (ms). */
function applyStrike(pose: Pose, t: number) {
  if (t < -260 || t > 320) return;
  if (t < -80) {
    // Coil back before striking.
    const k = ease((t + 260) / 180);
    Object.assign(pose, { rot: -13 * k, sx: 1 - 0.06 * k, sy: 1 + 0.06 * k, x: -7 * k });
  } else if (t < 0) {
    // Drive forward into the hit.
    const k = ease((t + 80) / 80);
    Object.assign(pose, {
      rot: lerp(-13, 19, k),
      sx: lerp(0.94, 1.15, k),
      sy: lerp(1.06, 0.88, k),
      x: lerp(-7, 19, k),
    });
  } else {
    // Recover to the guard.
    const k = ease(t / 320);
    Object.assign(pose, {
      rot: lerp(19, 0, k),
      sx: lerp(1.15, 1, k),
      sy: lerp(0.88, 1, k),
      x: lerp(19, 0, k),
    });
    pose.burst = t / 320;
  }
  pose.ghost = Math.max(pose.ghost, clamp01(1 - Math.abs(t - 30) / 150));
}

function applyHurt(pose: Pose, t: number, blocked: boolean) {
  if (t < 0 || t > 380) return;
  const strength = blocked ? 0.35 : 1;
  pose.flash = Math.max(pose.flash, (t < 90 ? 1 - t / 90 : 0) * strength);
  const k = (t < 120 ? ease(t / 120) : 1 - ease((t - 120) / 260)) * strength;
  Object.assign(pose, { rot: -9 * k, x: -5 * k, sx: 1 + 0.03 * k });
}

function poseAt(
  elapsed: number,
  motion: FighterMotion,
  kind: string,
  hits: number,
  impactMs: number,
): Pose {
  const pose = restPose();
  switch (motion) {
    case 'lunge': {
      const contacts = kind === 'combo' ? comboTimes(hits) : [impactMs];
      const nearest = contacts.reduce(
        (best, at) => (Math.abs(elapsed - at) < Math.abs(elapsed - best) ? at : best),
        contacts[0],
      );
      applyStrike(pose, elapsed - nearest);
      break;
    }
    case 'charge':
      pose.aura = clamp01(elapsed / Math.max(impactMs, 1));
      applyStrike(pose, elapsed - impactMs);
      break;
    case 'hurt':
      for (const at of kind === 'combo' ? comboTimes(hits) : [impactMs])
        applyHurt(pose, elapsed - at, kind === 'block');
      break;
    case 'evade': {
      const k = Math.sin(Math.PI * clamp01((elapsed - 80) / 540));
      Object.assign(pose, { y: -10 * k, x: -6 * k, rot: -6 * k });
      break;
    }
    case 'defeat': {
      const k = easeIn(clamp01((elapsed - 250) / 800));
      Object.assign(pose, { rot: -78 * k, y: 4 * k, gray: 0.85 * k });
      break;
    }
    default:
      break;
  }
  return pose;
}

export function SpriteFighter({
  art,
  motion,
  kind,
  hits,
  impactMs,
  flip,
  glow,
  bodyScale = 1,
  label,
}: SpriteFighterProps) {
  const body = useRef<HTMLDivElement>(null);
  const ghosts = useRef<(HTMLDivElement | null)[]>([]);
  const burst = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    for (const clip of Object.keys(CLIPS) as ClipName[]) new Image().src = clipUrl(art, clip);
  }, [art]);

  useEffect(() => {
    const element = body.current;
    const burstElement = burst.current;
    if (!element || !burstElement) return;
    const segments = timeline(motion, kind, hits, impactMs);
    const layers = [
      element,
      ...ghosts.current.filter((ghost): ghost is HTMLDivElement => ghost !== null),
    ];
    const start = performance.now();
    let shownClip: ClipName | null = null;
    let request = 0;

    const render = (now: number) => {
      const elapsed = now - start;
      const segment = segments.reduce(
        (current, candidate) => (candidate.at <= elapsed ? candidate : current),
        segments[0],
      );
      const spec = CLIPS[segment.clip];
      const raw = Math.floor(((elapsed - segment.at) * spec.fps) / 1000);
      const frame = spec.loop ? raw % spec.frames : Math.min(raw, spec.frames - 1);
      if (segment.clip !== shownClip) {
        for (const layer of layers) {
          layer.style.backgroundImage = `url(${clipUrl(art, segment.clip)})`;
          layer.style.backgroundSize = `${spec.frames * 100}% 100%`;
        }
        shownClip = segment.clip;
      }
      const position = `${(frame / (spec.frames - 1)) * 100}% 0`;

      const pose = poseAt(elapsed, motion, kind, hits, impactMs);
      // Pose offsets were tuned for a square frame the height of the slot; v2 frames are wider
      // and taller around the same figure, so % of the frame would travel further on screen.
      const reach = 1 / (art.frameAspect * art.scale);
      const transform = `translate(${pose.x * reach}%, ${pose.y / art.scale}%) rotate(${pose.rot}deg) scale(${pose.sx}, ${pose.sy})`;
      const glowRadius = Math.round(6 + 22 * pose.aura);
      const aura =
        pose.aura > 0 || glow
          ? ` drop-shadow(0 0 ${glowRadius}px ${glow && pose.aura === 0 ? '#ef8675' : art.element})`
          : '';
      element.style.backgroundPosition = position;
      element.style.transform = transform;
      element.style.filter = `brightness(${1 + 2.2 * pose.flash}) saturate(${1 - pose.flash}) grayscale(${pose.gray})${aura} drop-shadow(0 8px 12px #050e1488)`;

      ghosts.current.forEach((ghost, index) => {
        if (!ghost) return;
        ghost.style.backgroundPosition = position;
        ghost.style.transform = `translateX(${-(index + 1) * 7 * reach}%) ${transform}`;
        ghost.style.opacity = String(pose.ghost * (index === 0 ? 0.4 : 0.2));
      });

      if (pose.burst >= 0) {
        burstElement.style.opacity = String(1 - pose.burst);
        burstElement.style.transform = `translate(-50%, -50%) scale(${0.4 + 1.4 * ease(pose.burst)})`;
      } else {
        burstElement.style.opacity = '0';
      }
      request = requestAnimationFrame(render);
    };
    request = requestAnimationFrame(render);
    return () => cancelAnimationFrame(request);
  }, [art, motion, kind, hits, impactMs, glow]);

  const heightPercent = bodyScale * art.scale * 100;
  // First paint shows the idle pose even before the animation loop runs.
  const firstFrame: CSSProperties = {
    backgroundImage: `url(${clipUrl(art, 'idle')})`,
    backgroundSize: `${CLIPS.idle.frames * 100}% 100%`,
    backgroundPosition: '0% 0',
  };

  return (
    <div
      className={styles.fighter}
      role="img"
      aria-label={label}
      style={
        {
          height: `${heightPercent}%`,
          bottom: `${-(1 - art.feetY) * heightPercent}%`,
          '--sprite-flip': flip ? -1 : 1,
          '--element': art.element,
          '--frame-aspect': art.frameAspect,
          '--anchor-x': art.anchorX,
        } as CSSProperties
      }
    >
      {[0, 1].map((index) => (
        <div
          key={index}
          ref={(node) => {
            ghosts.current[index] = node;
          }}
          className={styles.ghost}
          style={firstFrame}
        />
      ))}
      <div ref={body} className={styles.body} style={firstFrame} />
      <span ref={burst} className={styles.burst} />
    </div>
  );
}
