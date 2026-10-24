'use client';

import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Check,
  ChevronRight,
  Flame,
  Footprints,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { BATTLE_BALANCE, REACTIVE_TIMINGS } from '@/teams/game/balance/balance';
import {
  attackDamage,
  battleReducer,
  createBattleState,
  type AttackTechnique,
  type BattleEvent,
  type DefenseTechnique,
} from '@/teams/game/battle/battle-engine';
import {
  ATTACK_CHALLENGES,
  DEFENSE_CHALLENGES,
  ENGLISH_ATTACK_CHALLENGES,
  ENGLISH_DEFENSE_CHALLENGES,
  isPrototypeAnswerCorrect,
} from '@/teams/game/content/prototype-battle';
import styles from './PrototypeBattle.module.css';
import stageStyles from './SpriteStage.module.css';
import { SpriteFighter } from './SpriteFighter';
import { HERO, levelFor, type Arena, type FighterArt } from './fighter-roster';

type ActiveChallenge =
  | { side: 'attack'; id: AttackTechnique }
  | { side: 'defense'; id: DefenseTechnique };
type TimingSession = { technique: DefenseTechnique; knowledgeCorrect: boolean };
type WeaponId = 'katana' | 'dragon';
type PrototypeBattleProps = {
  topicLabel?: string;
  opponentName?: string;
  opponentRole?: string;
  /** Painted villain to draw; defaults to the floor 1 villain. */
  opponentFighter?: FighterArt;
  /** Arena map and ambience; defaults to floor 1. */
  arena?: Arena;
  boss?: boolean;
  onVictory?: () => void;
};
type CombatFx = {
  kind: AttackTechnique | DefenseTechnique | 'hit';
  damage: number;
  hits: number;
  failed: boolean;
  target: 'player' | 'enemy';
  event: BattleEvent;
  impactMs: number;
  durationMs: number;
};

const attacks = [
  {
    id: 'heavy',
    label: 'Schwerer Hieb',
    subtitle: 'HEAVY STRIKE',
    detail: 'One answer. One devastating slash.',
    stat: '34 damage · 2-turn cooldown',
    Icon: Swords,
  },
  {
    id: 'combo',
    label: 'Dreier-Kombo',
    subtitle: 'THREE-HIT COMBO',
    detail: 'Each correct answer becomes a sword strike.',
    stat: '11 damage per hit · 1-turn cooldown',
    Icon: Zap,
  },
  {
    id: 'quiz',
    label: 'Wissensstrahl',
    subtitle: 'KNOWLEDGE BLAST',
    detail: 'Charge five answers. Reach 3/5 or take backlash.',
    stat: '24–40 damage · 3-turn cooldown',
    Icon: Flame,
  },
] as const;

const defenses = [
  {
    id: 'block',
    label: 'Blocken',
    subtitle: 'GUARD',
    detail: 'Answer, then brace as the golden ring closes.',
    stat: 'Wide timing window · take 20% damage',
    Icon: Shield,
  },
  {
    id: 'counter',
    label: 'Parade & Konter',
    subtitle: 'PARRY & COUNTER',
    detail: 'Two answers. A precise parry. Strike back.',
    stat: 'Tight timing window · return 14 damage',
    Icon: Swords,
  },
  {
    id: 'dodge',
    label: 'Ausweichen',
    subtitle: 'DODGE',
    detail: 'A typed answer and a well-timed sidestep.',
    stat: 'Medium timing window · avoid all damage',
    Icon: Footprints,
  },
] as const;

const impactSparks = [
  { angle: -72, distance: 54 },
  { angle: -34, distance: 68 },
  { angle: 2, distance: 50 },
  { angle: 38, distance: 63 },
  { angle: 78, distance: 46 },
] as const;

const QUESTION_TIME_SECONDS = 9;
const DECISION_TIME_MS = 3200;
const FEEDBACK_PAUSE_MS = 520;

function ReactiveDefense({
  session,
  onResolve,
}: {
  session: TimingSession;
  onResolve: (success: boolean) => void;
}) {
  const timing = REACTIVE_TIMINGS[session.technique];
  const action = defenses.find((item) => item.id === session.technique)!;
  const [phase, setPhase] = useState<'telegraph' | 'impact' | 'success' | 'miss'>('telegraph');
  const started = useRef(0);
  const resolved = useRef(false);
  const callback = useRef(onResolve);
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    callback.current = onResolve;
  }, [onResolve]);
  const finish = useCallback(
    (timed: boolean) => {
      if (resolved.current) return;
      resolved.current = true;
      const success = timed && session.knowledgeCorrect;
      setPhase(success ? 'success' : 'miss');
      resolveTimer.current = setTimeout(() => callback.current(success), 300);
    },
    [session.knowledgeCorrect],
  );

  const attempt = useCallback(() => {
    const elapsed = performance.now() - started.current;
    finish(elapsed >= timing.windupMs && elapsed < timing.windupMs + timing.windowMs);
  }, [finish, timing]);

  useEffect(() => {
    started.current = performance.now();
    input.current?.focus();
    const ready = setTimeout(() => {
      if (!resolved.current) setPhase('impact');
    }, timing.windupMs);
    const missed = setTimeout(() => finish(false), timing.windupMs + timing.windowMs);
    function onKey(event: KeyboardEvent) {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        attempt();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(ready);
      clearTimeout(missed);
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
      window.removeEventListener('keydown', onKey);
    };
  }, [attempt, finish, timing]);

  return (
    <div className={styles.reactivePanel} data-phase={phase}>
      <p className={styles.eyebrow}>Incoming strike</p>
      <h2>{action.label}</h2>
      <p>
        {session.knowledgeCorrect
          ? 'Wait for gold. Then react.'
          : 'Knowledge seal broken. This defense will fail.'}
      </p>
      <div
        className={styles.timingStage}
        style={{ '--windup': `${timing.windupMs}ms` } as CSSProperties}
      >
        <span className={styles.timingRing} />
        <span className={styles.timingCore} aria-live="polite">
          {phase === 'telegraph'
            ? 'WAIT'
            : phase === 'impact'
              ? 'NOW'
              : phase === 'success'
                ? 'PERFECT'
                : 'MISSED'}
        </span>
      </div>
      <button
        ref={input}
        className={styles.primaryButton}
        onClick={attempt}
        disabled={phase === 'success' || phase === 'miss'}
      >
        <kbd>SPACE</kbd> {action.label}
      </button>
      <small>{action.stat}</small>
    </div>
  );
}

function CombatEffects({ fx, color }: { fx: CombatFx; color: string }) {
  const sword =
    fx.kind === 'heavy' || fx.kind === 'combo' || fx.kind === 'counter' || fx.kind === 'hit';
  const slashes = fx.kind === 'combo' ? fx.hits : 1;
  return (
    <div
      className={styles.effects}
      data-kind={fx.kind}
      data-target={fx.target}
      data-failed={fx.failed}
      aria-hidden="true"
      style={{ '--impact': `${fx.impactMs}ms`, '--fx-color': color } as CSSProperties}
    >
      {sword &&
        (!fx.failed || fx.kind === 'hit') &&
        Array.from({ length: slashes }, (_, index) => (
          <div
            className={styles.cut}
            key={index}
            style={
              {
                '--cut-delay': `${
                  (fx.kind === 'combo' ? 130 : Math.max(0, fx.impactMs - 245)) + index * 150
                }ms`,
                '--hit-delay': `${(fx.kind === 'combo' ? 300 : fx.impactMs) + index * 150}ms`,
                '--cut-angle': `${index % 2 ? -8 : 8}deg`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 400 400" className={styles.swordTrail}>
              <defs>
                <linearGradient
                  id={`slash-${fx.kind}-${index}`}
                  x1="320"
                  y1="365"
                  x2="320"
                  y2="35"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="currentColor" stopOpacity="0" />
                  <stop offset=".55" stopColor="currentColor" stopOpacity=".18" />
                  <stop offset=".86" stopColor="currentColor" stopOpacity=".72" />
                  <stop offset="1" stopColor="white" stopOpacity=".98" />
                </linearGradient>
                <mask id={`slash-mask-${fx.kind}-${index}`}>
                  <path
                    className={styles.trailReveal}
                    d="M320 365 C90 310 90 90 320 35"
                    fill="none"
                    stroke="white"
                    strokeWidth="150"
                    strokeLinecap="round"
                    pathLength="1"
                  />
                </mask>
              </defs>
              <g mask={`url(#slash-mask-${fx.kind}-${index})`}>
                <path
                  d="M320 365 C90 310 90 90 320 35 C168 122 168 278 320 365Z"
                  fill={`url(#slash-${fx.kind}-${index})`}
                />
                <path
                  d="M320 365 C90 310 90 90 320 35"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  opacity=".7"
                />
              </g>
              <path
                className={styles.slashHead}
                d="M320 365 C90 310 90 90 320 35"
                fill="none"
                stroke="white"
                strokeWidth="9"
                strokeLinecap="round"
                pathLength="1"
              />
            </svg>
            <b className={styles.hitNumber}>
              {fx.kind === 'combo' ? BATTLE_BALANCE.comboDamagePerHit : fx.damage}
            </b>
            <span className={styles.impactFlash} />
            {impactSparks.map(({ angle, distance }) => (
              <i
                className={styles.impactSpark}
                key={angle}
                style={
                  {
                    '--spark-angle': `${angle}deg`,
                    '--spark-distance': `${distance}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
      {fx.kind === 'quiz' && (
        <>
          <span className={styles.chargeRings}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.energyMotes}>
            {Array.from({ length: 8 }, (_, index) => (
              <i
                key={index}
                style={
                  {
                    '--mote-angle': `${index * 45}deg`,
                    '--mote-delay': `${index * 90}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
          <span className={styles.chargeOrb} />
          {fx.failed ? (
            <span className={styles.backlashBurst} />
          ) : (
            <span className={styles.energyBeam} />
          )}
          <b className={styles.energyNumber}>{fx.damage}</b>
        </>
      )}
      {(fx.kind === 'block' || fx.kind === 'counter') && (
        <div className={styles.guardSeal}>
          <Shield size={60} />
        </div>
      )}
      {fx.kind === 'dodge' && <span className={styles.dodgeTrail} />}
    </div>
  );
}

export default function PrototypeBattle({
  topicLabel,
  opponentName = 'Tinten-Yokai',
  opponentRole = 'FLOOR GUARDIAN',
  opponentFighter = levelFor('1').villain,
  arena = levelFor('1').arena,
  boss = false,
  onVictory,
}: PrototypeBattleProps = {}) {
  const [battle, dispatch] = useReducer(battleReducer, undefined, createBattleState);
  const [active, setActive] = useState<ActiveChallenge | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [choice, setChoice] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [timingSession, setTimingSession] = useState<TimingSession | null>(null);
  const [fx, setFx] = useState<CombatFx | null>(null);
  const [selected, setSelected] = useState(0);
  const [fullMotion, setFullMotion] = useState(true);
  const [sampleLanguage, setSampleLanguage] = useState<'de' | 'en'>('de');
  const [weapon, setWeapon] = useState<WeaponId>('katana');
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_SECONDS);
  const [decisionMsLeft, setDecisionMsLeft] = useState(DECISION_TIME_MS);
  const actionLock = useRef(false);
  const answerLock = useRef(false);
  const decisionLock = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryReported = useRef(false);
  const advanceChallengeRef = useRef<(correct: boolean) => void>(() => undefined);
  const beginChallengeRef = useRef<(index: number) => void>(() => undefined);
  const selectedRef = useRef(0);
  const menu = useRef<HTMLDivElement>(null);
  const answerInput = useRef<HTMLInputElement>(null);
  const isFinished = battle.turn === 'victory' || battle.turn === 'defeat';
  const choosing = !active && !timingSession && !fx && !isFinished;
  const isDefense = battle.turn === 'enemy';
  const commands = isDefense ? defenses : attacks;
  const selectedCommand = commands[selected];
  const challenge = active
    ? active.side === 'attack'
      ? (sampleLanguage === 'de' ? ATTACK_CHALLENGES : ENGLISH_ATTACK_CHALLENGES)[active.id]
      : (sampleLanguage === 'de' ? DEFENSE_CHALLENGES : ENGLISH_DEFENSE_CHALLENGES)[active.id]
    : null;
  const question = challenge?.questions[questionIndex];
  const stanceVariant = (battle.round + Number(isDefense)) % 3;

  useEffect(() => {
    if (!fx) return;
    const impact = setTimeout(() => dispatch(fx.event), fx.impactMs);
    const end = setTimeout(() => {
      setFx(null);
      actionLock.current = false;
    }, fx.durationMs);
    return () => {
      clearTimeout(impact);
      clearTimeout(end);
    };
  }, [fx]);

  useEffect(() => {
    if (battle.turn !== 'victory' || fx || victoryReported.current) return;
    victoryReported.current = true;
    onVictory?.();
  }, [battle.turn, fx, onVictory]);

  useEffect(() => {
    if (question?.kind === 'typed') answerInput.current?.focus();
  }, [question]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const beginChallenge = useCallback(
    (index: number) => {
      if (!choosing || actionLock.current || decisionLock.current) return;
      if (!isDefense && battle.cooldowns[attacks[index].id] > 0) return;
      decisionLock.current = true;
      setSelected(index);
      setActive(
        isDefense
          ? { side: 'defense', id: defenses[index].id }
          : { side: 'attack', id: attacks[index].id },
      );
      setQuestionIndex(0);
      setChoice('');
      setTypedAnswer('');
      setCorrectAnswers(0);
      setFeedback(null);
      setSecondsLeft(QUESTION_TIME_SECONDS);
      answerLock.current = false;
    },
    [battle.cooldowns, choosing, isDefense],
  );

  useEffect(() => {
    beginChallengeRef.current = beginChallenge;
  }, [beginChallenge]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!choosing) return;
    decisionLock.current = false;
    const available = commands
      .map((_, index) => index)
      .filter((index) => isDefense || battle.cooldowns[attacks[index].id] === 0);
    const initial = available.includes(selectedRef.current)
      ? selectedRef.current
      : (available[0] ?? 0);
    selectedRef.current = initial;
    const deadline = performance.now() + DECISION_TIME_MS;
    const frame = window.requestAnimationFrame(() => {
      setSelected(initial);
      setDecisionMsLeft(DECISION_TIME_MS);
    });
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, deadline - performance.now());
      setDecisionMsLeft(remaining);
      if (remaining > 0) return;
      window.clearInterval(timer);
      beginChallengeRef.current(selectedRef.current);
    }, 100);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [battle.cooldowns, battle.round, battle.turn, choosing, commands, isDefense]);

  useEffect(() => {
    if (!choosing) return;
    function onKey(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target instanceof HTMLInputElement
      )
        return;
      const number = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
      if (number >= 0) {
        event.preventDefault();
        beginChallenge(number);
      }
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        const available = commands
          .map((_, index) => index)
          .filter((index) => isDefense || battle.cooldowns[attacks[index].id] === 0);
        const position = available.indexOf(selected);
        const next =
          available[
            (position + (event.code === 'ArrowDown' ? 1 : available.length - 1)) % available.length
          ];
        selectedRef.current = next;
        setSelected(next);
        menu.current?.querySelectorAll('button')[next]?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beginChallenge, choosing, commands, isDefense, battle.cooldowns, selected]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (question?.kind !== 'typed') return;
    resolveAnswer(typedAnswer);
  }

  function advanceChallenge(correct: boolean) {
    if (!active || !challenge || actionLock.current) return;
    const score = correctAnswers + Number(correct);
    if (questionIndex < challenge.questions.length - 1) {
      setCorrectAnswers(score);
      setQuestionIndex((index) => index + 1);
      setChoice('');
      setTypedAnswer('');
      setFeedback(null);
      setSecondsLeft(QUESTION_TIME_SECONDS);
      answerLock.current = false;
      return;
    }
    if (active.side === 'attack') {
      actionLock.current = true;
      const damage = attackDamage(active.id, score, challenge.questions.length);
      const backlash = active.id === 'quiz' && score < 3;
      setFx({
        kind: active.id,
        hits: score,
        damage: backlash ? BATTLE_BALANCE.quizBacklashDamage : damage,
        failed: damage === 0,
        target: backlash ? 'player' : 'enemy',
        impactMs:
          active.id === 'quiz'
            ? 1050
            : active.id === 'combo'
              ? 300 + Math.max(0, score - 1) * 150
              : 380,
        durationMs: active.id === 'quiz' ? 1700 : active.id === 'combo' ? 1150 : 950,
        event: {
          type: 'ATTACK_RESOLVED',
          technique: active.id,
          correct: score,
          total: challenge.questions.length,
        },
      });
    } else {
      setTimingSession({
        technique: active.id,
        knowledgeCorrect: score === challenge.questions.length,
      });
    }
    setActive(null);
    setFeedback(null);
  }

  function resolveAnswer(value: string) {
    if (!question || answerLock.current || !value.trim()) return;
    answerLock.current = true;
    const correct = isPrototypeAnswerCorrect(question, value);
    setFeedback(correct);
    feedbackTimer.current = setTimeout(
      () => advanceChallengeRef.current(correct),
      FEEDBACK_PAUSE_MS,
    );
  }

  useEffect(() => {
    advanceChallengeRef.current = advanceChallenge;
  });

  useEffect(() => {
    if (!question || feedback !== null || answerLock.current || secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      if (secondsLeft > 1) {
        setSecondsLeft(secondsLeft - 1);
        return;
      }
      answerLock.current = true;
      setSecondsLeft(0);
      setFeedback(false);
      feedbackTimer.current = setTimeout(
        () => advanceChallengeRef.current(false),
        FEEDBACK_PAUSE_MS,
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [feedback, question, secondsLeft]);

  function resolveDefense(success: boolean) {
    if (!timingSession || actionLock.current) return;
    actionLock.current = true;
    const technique = timingSession.technique;
    const event: BattleEvent = {
      type: 'DEFENSE_RESOLVED',
      technique,
      correct: Number(success),
      total: 1,
    };
    const next = battleReducer(battle, event);
    setFx({
      kind: success ? technique : 'hit',
      failed: false,
      hits: 1,
      target: success && technique === 'counter' ? 'enemy' : 'player',
      damage:
        success && technique === 'counter'
          ? battle.enemyHp - next.enemyHp
          : battle.playerHp - next.playerHp,
      impactMs: 360,
      durationMs: 950,
      event,
    });
    setTimingSession(null);
  }

  function restart() {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFx(null);
    setTimingSession(null);
    setActive(null);
    setFeedback(null);
    actionLock.current = false;
    answerLock.current = false;
    decisionLock.current = false;
    victoryReported.current = false;
    selectedRef.current = 0;
    setSelected(0);
    setSecondsLeft(QUESTION_TIME_SECONDS);
    setDecisionMsLeft(DECISION_TIME_MS);
    dispatch({ type: 'RESET' });
  }

  const playerMotion = fx
    ? fx.kind === 'dodge'
      ? 'evade'
      : fx.target === 'player'
        ? 'hurt'
        : fx.kind === 'heavy' || fx.kind === 'combo' || fx.kind === 'counter'
          ? 'lunge'
          : fx.kind === 'quiz'
            ? 'charge'
            : 'idle'
    : isFinished
      ? battle.turn === 'victory'
        ? 'victory'
        : 'defeat'
      : 'faceoff';
  const enemyMotion = fx
    ? fx.target === 'enemy' && !fx.failed
      ? 'hurt'
      : fx.target === 'player' && fx.kind !== 'quiz'
        ? 'lunge'
        : 'faceoff'
    : isFinished
      ? battle.turn === 'victory'
        ? 'defeat'
        : 'victory'
      : 'faceoff';

  return (
    <div className={styles.shell} data-full-motion={fullMotion} data-weapon={weapon}>
      <header className={styles.header}>
        <h1>
          EDUDOJO <small>Combat test · 1 vs 1</small>
        </h1>
        <span>
          {topicLabel ?? (sampleLanguage === 'de' ? 'Wortschatz' : 'English grammar')} · Round{' '}
          {battle.round}
        </span>
        <label className={styles.devControl}>
          DEV SET
          <select
            aria-label="Question sample language"
            value={sampleLanguage}
            onChange={(event) => {
              setSampleLanguage(event.target.value as 'de' | 'en');
              restart();
            }}
          >
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>
        </label>
        <label className={styles.equipmentControl}>
          EQUIPMENT
          <select
            aria-label="Player equipment"
            value={weapon}
            onChange={(event) => setWeapon(event.target.value as WeaponId)}
          >
            <option value="katana">Training Katana</option>
            <option value="dragon">Dragon Fang</option>
          </select>
        </label>
        <label
          className={styles.motionControl}
          title="Override system reduced motion for combat testing"
        >
          <input
            type="checkbox"
            checked={fullMotion}
            onChange={(event) => setFullMotion(event.target.checked)}
          />
          Full motion
        </label>
        <button className={styles.resetButton} onClick={restart}>
          <RotateCcw size={15} /> Restart duel
        </button>
      </header>

      <section
        className={styles.arena}
        aria-label="Dojo battle"
        data-fx={fx?.kind ?? ''}
        data-target={fx?.target ?? ''}
        data-failed={fx?.failed ?? false}
        data-standoff={choosing || active !== null || timingSession !== null}
        style={
          {
            '--impact': `${fx?.impactMs ?? 0}ms`,
            '--stage-hits': fx?.kind === 'combo' ? Math.max(1, fx.hits) : 1,
          } as CSSProperties
        }
      >
        <div className={styles.world} aria-hidden="true">
          <div
            className={stageStyles.stage}
            data-ambience={arena.ambience}
            style={{ '--map': `url(${arena.map})` } as CSSProperties}
          >
            <span className={stageStyles.map} />
            <span className={stageStyles.ambience} />
            <span className={stageStyles.vignette} />
          </div>
          <div className={styles.atmosphere} />

          <div
            className={styles.playerActor}
            data-motion={playerMotion}
            data-kind={fx?.kind ?? ''}
            data-stance={stanceVariant}
            data-variant={battle.round % 3}
            style={
              {
                '--first-impact': `${fx?.kind === 'combo' ? 300 : (fx?.impactMs ?? 0)}ms`,
                '--hits': fx?.kind === 'combo' ? fx.hits : 1,
              } as CSSProperties
            }
          >
            <div className={styles.groundShadow} />
            <span className={styles.actorAura} />
            <span className={styles.motionDust} />
            <div className={`${styles.playerSprite} ${stageStyles.paintedSlot}`}>
              <SpriteFighter
                art={HERO}
                motion={playerMotion}
                kind={fx?.kind ?? ''}
                hits={fx?.hits ?? 1}
                impactMs={fx?.impactMs ?? 0}
                glow={weapon === 'dragon'}
                bodyScale={1}
                label={HERO.name}
              />
            </div>
          </div>
          <div
            className={styles.enemyActor}
            data-motion={enemyMotion}
            data-kind={fx?.kind ?? ''}
            data-stance={stanceVariant}
            data-variant={battle.round % 3}
            style={
              {
                '--first-impact': `${fx?.kind === 'combo' ? 300 : (fx?.impactMs ?? 0)}ms`,
                '--hits': fx?.kind === 'combo' ? fx.hits : 1,
              } as CSSProperties
            }
          >
            <div className={styles.groundShadow} />
            <span className={styles.actorAura} />
            <span className={styles.motionDust} />
            <div className={`${styles.enemySprite} ${stageStyles.paintedSlot}`}>
              <SpriteFighter
                art={opponentFighter}
                motion={enemyMotion}
                kind={fx?.kind ?? ''}
                hits={fx?.hits ?? 1}
                impactMs={fx?.impactMs ?? 0}
                flip
                bodyScale={1}
                label={opponentFighter.name}
              />
            </div>
          </div>
          {isDefense && !fx && (
            <div className={styles.enemyTelegraph}>
              <span />
              <b>刃</b>
            </div>
          )}
          {fx && (
            <CombatEffects
              fx={fx}
              color={fx.target === 'enemy' ? HERO.element : opponentFighter.element}
            />
          )}
        </div>
        <span className={styles.stageHint} aria-hidden="true">
          2D SIDE-VIEW COMBAT PLANE
        </span>
        {challenge && question && (
          <div
            className={styles.questionTimer}
            data-low={secondsLeft <= 3}
            data-locked={feedback !== null}
            role="timer"
            aria-live="polite"
          >
            <small>ANSWER TIMER</small>
            <strong>{secondsLeft}</strong>
            <span>
              <i style={{ width: `${(secondsLeft / QUESTION_TIME_SECONDS) * 100}%` }} />
            </span>
          </div>
        )}

        {choosing && (
          <div
            className={styles.decisionTimer}
            data-low={decisionMsLeft <= 1200}
            role="timer"
            aria-label={`Technique locks in ${Math.ceil(decisionMsLeft / 100) / 10} seconds`}
          >
            <small>LOCK IN</small>
            <strong>{(Math.ceil(decisionMsLeft / 100) / 10).toFixed(1)}</strong>
            <span>
              <i style={{ width: `${(decisionMsLeft / DECISION_TIME_MS) * 100}%` }} />
            </span>
          </div>
        )}

        <div className={styles.enemyHud}>
          <span>{opponentRole}</span>
          <h3>{opponentName}</h3>
          <div
            className={styles.hpTrack}
            role="progressbar"
            aria-label="Guardian health"
            aria-valuenow={battle.enemyHp}
            aria-valuemin={0}
            aria-valuemax={battle.enemyMaxHp}
          >
            <i style={{ width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%` }} />
          </div>
          <small>
            <b>{battle.enemyHp}</b> / {battle.enemyMaxHp} HP
          </small>
        </div>

        {choosing && (
          <div className={styles.commandArea}>
            <p className={styles.eyebrow}>
              {isDefense ? 'TIME SLOWED · CHOOSE A RESPONSE' : 'YOUR TURN · CHOOSE A TECHNIQUE'}
            </p>
            <div
              className={styles.commandFan}
              ref={menu}
              role="group"
              aria-label={isDefense ? 'Defense techniques' : 'Attack techniques'}
            >
              {commands.map(({ id, label, subtitle, Icon }, index) => {
                const cooldown = isDefense ? 0 : battle.cooldowns[attacks[index].id];
                return (
                  <button
                    key={id}
                    onMouseEnter={() => {
                      selectedRef.current = index;
                      setSelected(index);
                    }}
                    onFocus={() => {
                      selectedRef.current = index;
                      setSelected(index);
                    }}
                    className={selected === index ? styles.commandSelected : ''}
                    disabled={cooldown > 0}
                    onClick={() => beginChallenge(index)}
                    style={{ '--slot': index } as CSSProperties}
                  >
                    <kbd>{index + 1}</kbd>
                    <Icon size={20} />
                    <span>
                      <small>
                        {cooldown
                          ? `COOLDOWN · ${cooldown} TURN${cooldown === 1 ? '' : 'S'}`
                          : subtitle}
                      </small>
                      <strong>{label}</strong>
                    </span>
                    <ChevronRight size={19} className={styles.commandArrow} />
                  </button>
                );
              })}
            </div>
            <div className={styles.commandDescription}>
              <p>{selectedCommand.detail}</p>
              <small>{selectedCommand.stat}</small>
            </div>
            <div className={styles.controlHint}>
              <kbd>1</kbd>
              <kbd>2</kbd>
              <kbd>3</kbd> choose <span> / </span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate <span> / </span> auto-locks when time expires
            </div>
          </div>
        )}

        {challenge && question && (
          <form className={styles.questionPanel} onSubmit={submitAnswer} lang={sampleLanguage}>
            <div className={styles.questionHeader}>
              <div>
                <p className={styles.eyebrow}>
                  {active?.side === 'attack' ? 'TECHNIQUE LOCKED' : 'DEFENSE PREPARATION'}
                </p>
                <h2>{challenge.title}</h2>
              </div>
              <span>
                {questionIndex + 1}
                <small> / {challenge.questions.length}</small>
              </span>
            </div>
            {active?.id === 'quiz' && (
              <div
                className={styles.chargeMeter}
                aria-label={`Charge: ${correctAnswers + Number(feedback === true)} of 5`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <i
                    key={index}
                    data-charged={index < correctAnswers + Number(feedback === true)}
                  />
                ))}
                <small>3 / 5 TO RELEASE</small>
              </div>
            )}
            <fieldset disabled={feedback !== null}>
              <legend>{question.prompt}</legend>
              {question.kind === 'mcq' ? (
                <div className={styles.options}>
                  {question.options?.map((option, index) => (
                    <label key={option} className={choice === option ? styles.optionSelected : ''}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={choice === option}
                        onChange={() => {
                          setChoice(option);
                          resolveAnswer(option);
                        }}
                      />
                      <span>{String.fromCharCode(65 + index)}</span>
                      <b>{option}</b>
                      {choice === option && <Check size={16} />}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  ref={answerInput}
                  className={styles.typedInput}
                  aria-label={question.prompt}
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder={sampleLanguage === 'de' ? 'Deine Antwort…' : 'Your answer…'}
                  autoComplete="off"
                />
              )}
            </fieldset>
            {feedback !== null && (
              <div
                className={feedback ? styles.feedbackCorrect : styles.feedbackWrong}
                role="status"
              >
                <strong>
                  {feedback
                    ? sampleLanguage === 'de'
                      ? 'Richtig. Energie gesammelt.'
                      : 'Correct. Energy gained.'
                    : `${sampleLanguage === 'de' ? 'Antwort' : 'Answer'}: ${question.answer}`}
                </strong>
                <span>{question.explanation}</span>
              </div>
            )}
            <div className={styles.questionActions}>
              <small>{challenge.subtitle}</small>
              <span className={styles.autoAdvance}>
                {feedback !== null
                  ? questionIndex === challenge.questions.length - 1
                    ? 'Releasing technique…'
                    : 'Next question…'
                  : question.kind === 'typed'
                    ? 'ENTER TO ANSWER'
                    : 'SELECT TO ANSWER'}
              </span>
            </div>
          </form>
        )}

        {timingSession && <ReactiveDefense session={timingSession} onResolve={resolveDefense} />}
        {isFinished && !fx && (
          <div className={styles.result}>
            <span>{battle.turn === 'victory' ? '勝' : '再'}</span>
            <p className={styles.eyebrow}>
              {battle.turn === 'victory'
                ? boss
                  ? 'TOPIC MASTERED'
                  : 'FLOOR CLEARED'
                : 'THE LESSON CONTINUES'}
            </p>
            <h2>{battle.turn === 'victory' ? 'Knowledge prevails.' : 'Rise. Learn. Return.'}</h2>
            <p>
              {battle.turn === 'victory'
                ? boss
                  ? 'You proved mastery across every subtopic in this input.'
                  : 'Next in your journey: return to Sensei and study the next topic.'
                : 'Study the explanations and try a different combination.'}
            </p>
            <button className={styles.primaryButton} onClick={restart}>
              Replay training duel <RotateCcw size={16} />
            </button>
          </div>
        )}

        <div className={styles.playerHud}>
          <div>
            <span>THE APPRENTICE</span>
            <h3>Sprachschüler</h3>
            <div
              className={styles.hpTrack}
              role="progressbar"
              aria-label="Player health"
              aria-valuenow={battle.playerHp}
              aria-valuemin={0}
              aria-valuemax={battle.playerMaxHp}
            >
              <i style={{ width: `${(battle.playerHp / battle.playerMaxHp) * 100}%` }} />
            </div>
            <small>
              <b>{battle.playerHp}</b> / {battle.playerMaxHp} HP{' '}
              <em>
                <Sparkles size={11} /> {battle.combo} FOCUS
              </em>
            </small>
          </div>
        </div>
        <p className={styles.battleLog} role="status">
          {battle.lastMessage}
        </p>
      </section>
      <footer className={styles.footer}>
        <p>
          Game Team · 1v1 combat sandbox · {sampleLanguage === 'de' ? 'German' : 'English'}
          sample questions · Temporary art for motion testing
        </p>
      </footer>
    </div>
  );
}
