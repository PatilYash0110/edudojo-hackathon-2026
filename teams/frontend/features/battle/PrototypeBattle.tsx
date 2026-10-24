'use client';

import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ArrowUpRight,
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

type ActiveChallenge =
  | { side: 'attack'; id: AttackTechnique }
  | { side: 'defense'; id: DefenseTechnique };
type TimingSession = { technique: DefenseTechnique; knowledgeCorrect: boolean };
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
      resolveTimer.current = setTimeout(() => callback.current(success), 550);
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

function CombatEffects({ fx }: { fx: CombatFx }) {
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
      style={{ '--impact': `${fx.impactMs}ms` } as CSSProperties}
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
                  (fx.kind === 'combo' ? 190 : Math.max(0, fx.impactMs - 245)) + index * 180
                }ms`,
                '--hit-delay': `${(fx.kind === 'combo' ? 360 : fx.impactMs) + index * 180}ms`,
                '--cut-angle': `${index % 2 ? -18 : 18}deg`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 400 400" className={styles.swordTrail}>
              <defs>
                <linearGradient
                  id={`slash-${fx.kind}-${index}`}
                  x1="40"
                  y1="340"
                  x2="360"
                  y2="40"
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
                    d="M42 350 C52 145 188 28 365 46"
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
                  d="M42 350 C52 145 188 28 365 46 C242 86 106 205 42 350Z"
                  fill={`url(#slash-${fx.kind}-${index})`}
                />
                <path
                  d="M42 350 C52 145 188 28 365 46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  opacity=".7"
                />
              </g>
              <path
                className={styles.slashHead}
                d="M42 350 C52 145 188 28 365 46"
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
          </div>
        ))}
      {fx.kind === 'quiz' && (
        <>
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

export default function PrototypeBattle() {
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
  const [cameraYaw, setCameraYaw] = useState(0);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const actionLock = useRef(false);
  const orbitDrag = useRef<{ pointerId: number; startX: number; startYaw: number } | null>(null);
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
    if (question?.kind === 'typed') answerInput.current?.focus();
  }, [question]);

  const beginChallenge = useCallback(
    (index: number) => {
      if (!choosing || actionLock.current) return;
      if (!isDefense && battle.cooldowns[attacks[index].id] > 0) return;
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
    },
    [battle.cooldowns, choosing, isDefense],
  );

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
        setSelected(next);
        menu.current?.querySelectorAll('button')[next]?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beginChallenge, choosing, commands, isDefense, battle.cooldowns, selected]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question || feedback !== null) return;
    const value = question.kind === 'typed' ? typedAnswer : choice;
    if (value.trim()) setFeedback(isPrototypeAnswerCorrect(question, value));
  }

  function continueChallenge() {
    if (!active || !challenge || feedback === null || actionLock.current) return;
    const score = correctAnswers + Number(feedback);
    if (questionIndex < challenge.questions.length - 1) {
      setCorrectAnswers(score);
      setQuestionIndex((index) => index + 1);
      setChoice('');
      setTypedAnswer('');
      setFeedback(null);
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
            ? 1400
            : active.id === 'combo'
              ? 360 + Math.max(0, score - 1) * 180
              : 460,
        durationMs: active.id === 'quiz' ? 2200 : 1200,
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
      impactMs: 460,
      durationMs: 1200,
      event,
    });
    setTimingSession(null);
  }

  function restart() {
    setFx(null);
    setTimingSession(null);
    setActive(null);
    setFeedback(null);
    actionLock.current = false;
    setSelected(0);
    dispatch({ type: 'RESET' });
  }

  function beginOrbit(event: ReactPointerEvent<HTMLElement>) {
    if (
      event.button !== 0 ||
      (event.target instanceof Element &&
        event.target.closest('button, input, select, label, form'))
    )
      return;
    orbitDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startYaw: cameraYaw,
    };
    setIsOrbiting(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveOrbit(event: ReactPointerEvent<HTMLElement>) {
    if (orbitDrag.current?.pointerId !== event.pointerId) return;
    const nextYaw = orbitDrag.current.startYaw + (event.clientX - orbitDrag.current.startX) / 18;
    setCameraYaw(Math.max(-10, Math.min(10, nextYaw)));
  }

  function endOrbit(event: ReactPointerEvent<HTMLElement>) {
    if (orbitDrag.current?.pointerId !== event.pointerId) return;
    orbitDrag.current = null;
    setIsOrbiting(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    : 'idle';
  const enemyMotion = fx
    ? fx.target === 'enemy' && !fx.failed
      ? 'hurt'
      : fx.target === 'player' && fx.kind !== 'quiz'
        ? 'lunge'
        : 'idle'
    : isDefense
      ? 'windup'
      : 'idle';

  return (
    <div className={styles.shell} data-full-motion={fullMotion}>
      <header className={styles.header}>
        <h1>
          EDUDOJO <small>Combat test · 1 vs 1</small>
        </h1>
        <span>
          {sampleLanguage === 'de' ? 'Wortschatz' : 'English grammar'} · Round {battle.round}
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
        data-orbiting={isOrbiting}
        onPointerDown={beginOrbit}
        onPointerMove={moveOrbit}
        onPointerUp={endOrbit}
        onPointerCancel={endOrbit}
        style={
          {
            '--impact': `${fx?.impactMs ?? 0}ms`,
            '--stage-hits': fx?.kind === 'combo' ? Math.max(1, fx.hits) : 1,
          } as CSSProperties
        }
      >
        <div
          className={styles.world}
          aria-hidden="true"
          style={{ '--camera-yaw': `${cameraYaw}deg` } as CSSProperties}
        >
          <div className={styles.backdrop} />
          <div className={styles.atmosphere} />

          <div
            className={styles.playerActor}
            data-motion={playerMotion}
            data-kind={fx?.kind ?? ''}
            style={
              {
                '--first-impact': `${fx?.kind === 'combo' ? 360 : (fx?.impactMs ?? 0)}ms`,
                '--hits': fx?.kind === 'combo' ? fx.hits : 1,
              } as CSSProperties
            }
          >
            <div className={styles.groundShadow} />
            <div className={styles.playerModel} role="img" aria-label="Player position placeholder">
              <span className={styles.actorSword} />
            </div>
          </div>
          <div
            className={styles.enemyActor}
            data-motion={enemyMotion}
            data-kind={fx?.kind ?? ''}
            style={
              {
                '--first-impact': `${fx?.kind === 'combo' ? 360 : (fx?.impactMs ?? 0)}ms`,
                '--hits': fx?.kind === 'combo' ? fx.hits : 1,
              } as CSSProperties
            }
          >
            <div className={styles.groundShadow} />
            <div className={styles.enemyModel} role="img" aria-label="Enemy position placeholder">
              <span className={styles.actorSword} />
            </div>
          </div>
          {isDefense && !fx && (
            <div className={styles.enemyTelegraph}>
              <span />
              <b>刃</b>
            </div>
          )}
          {fx && <CombatEffects fx={fx} />}
        </div>
        <span className={styles.orbitHint} aria-hidden="true">
          DRAG THE ARENA TO ORBIT
        </span>

        <div className={styles.enemyHud}>
          <span>FLOOR GUARDIAN</span>
          <h3>Tinten-Yokai</h3>
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
                    onMouseEnter={() => setSelected(index)}
                    onFocus={() => setSelected(index)}
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
              <kbd>↓</kbd> navigate <span> / </span>
              <kbd>↵</kbd> confirm
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
                        onChange={() => setChoice(option)}
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
              {feedback !== null ? (
                <button type="button" className={styles.primaryButton} onClick={continueChallenge}>
                  {questionIndex === challenge.questions.length - 1
                    ? 'Release technique'
                    : 'Next question'}
                  <ArrowUpRight size={17} />
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={question.kind === 'typed' ? !typedAnswer.trim() : !choice}
                >
                  Lock answer <ChevronRight size={17} />
                </button>
              )}
            </div>
          </form>
        )}

        {timingSession && <ReactiveDefense session={timingSession} onResolve={resolveDefense} />}
        {isFinished && !fx && (
          <div className={styles.result}>
            <span>{battle.turn === 'victory' ? '勝' : '再'}</span>
            <p className={styles.eyebrow}>
              {battle.turn === 'victory' ? 'FLOOR CLEARED' : 'THE LESSON CONTINUES'}
            </p>
            <h2>{battle.turn === 'victory' ? 'Knowledge prevails.' : 'Rise. Learn. Return.'}</h2>
            <p>
              {battle.turn === 'victory'
                ? 'Next in your journey: return to Sensei and study the next topic.'
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
