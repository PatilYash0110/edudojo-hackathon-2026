'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { animate, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { FileText, HelpCircle, Gamepad2, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useStageStore } from '@/lib/store';
import type { Scene, SceneType } from '@/lib/types/stage';
import {
  completeSummaryForScenes,
  pendingCompleteSummary,
  readSceneQuizAnswers,
  summarizeScenes,
} from '@/lib/classroom/complete-summary';
import {
  fallbackCategories,
  fetchInsightCategories,
  hasEnoughAxes,
  ratingKey,
  type InsightCategory,
} from '@/lib/classroom/insights';
import { CompleteRadar } from '@/components/scene-renderers/complete-radar';
import { loadQuizAttemptState } from '@/lib/quiz/runtime';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClassroomComplete');

const SCENE_TYPE_ICONS: Record<SceneType, typeof FileText> = {
  slide: FileText,
  quiz: HelpCircle,
  interactive: Gamepad2,
  pbl: Puzzle,
};

/** How far the fit-to-stage scale may go in either direction. */
const MIN_FIT_SCALE = 0.45;
const MAX_FIT_SCALE = 1.35;
/** Breathing room so the outermost card never sits flush against the stage. */
const FIT_INSET = 16;

const TYPE_ORDER: SceneType[] = ['slide', 'quiz', 'interactive', 'pbl'];

// Dojo palette (app/globals.css): vermilion seal, kintsugi gold, hinoki
// timber and rice paper. Flips with the light/dark tokens like the home page.
const CONFETTI_COLORS = [
  'var(--shu)',
  'var(--gold)',
  'var(--wood)',
  'color-mix(in oklab, var(--gold) 55%, var(--washi))',
  'color-mix(in oklab, var(--shu) 60%, var(--washi))',
  'var(--washi-deep)',
  'color-mix(in oklab, var(--wood) 55%, var(--washi))',
];

function encouragementKey(pct: number): 'high' | 'mid' | 'low' {
  if (pct >= 90) return 'high';
  if (pct >= 70) return 'mid';
  return 'low';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  w: number;
  h: number;
  duration: number;
  delay: number;
  round: boolean;
}

function makeConfetti(count: number): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const distance = 180 + Math.random() * 280;
    const w = 6 + Math.random() * 6;
    arr.push({
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 50,
      rotate: (Math.random() - 0.5) * 720,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w,
      h: Math.random() > 0.3 ? w * 0.4 : w,
      duration: 1.0 + Math.random() * 0.9,
      delay: Math.random() * 0.12,
      round: Math.random() > 0.72,
    });
  }
  return arr;
}

/** Never-changing store: the snapshot differs between server and client. */
const subscribeNever = () => () => {};

function Confetti() {
  const prefersReducedMotion = useReducedMotion();
  const particles = useMemo(() => makeConfetti(55), []);
  // The particle geometry is random, so server and client HTML can never
  // agree — render nothing until after hydration.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  if (prefersReducedMotion || !hydrated) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.2 }}
          animate={{
            x: p.x,
            y: p.y + 220,
            opacity: 0,
            rotate: p.rotate,
            scale: 1,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.1, 0.5, 0.4, 1] }}
          style={{
            position: 'absolute',
            width: p.w,
            height: p.h,
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : 2,
          }}
        />
      ))}
    </div>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z" fill="currentColor" />
    </svg>
  );
}

function Sparkles() {
  const prefersReducedMotion = useReducedMotion();
  const sparkles = useMemo(
    () => [
      { x: -95, y: -40, size: 14, delay: 0.8, repeatDelay: 0.8 },
      { x: 95, y: -20, size: 18, delay: 1.1, repeatDelay: 1.0 },
      { x: -78, y: 55, size: 11, delay: 1.35, repeatDelay: 1.2 },
      { x: 82, y: 62, size: 15, delay: 1.55, repeatDelay: 0.9 },
      { x: 0, y: -88, size: 10, delay: 1.75, repeatDelay: 1.1 },
    ],
    [],
  );
  if (prefersReducedMotion) return null;

  return (
    <>
      {sparkles.map((s, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute text-[var(--gold)]"
          style={{
            width: s.size,
            height: s.size,
            left: `calc(50% + ${s.x}px - ${s.size / 2}px)`,
            top: `calc(50% + ${s.y}px - ${s.size / 2}px)`,
          }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{ scale: [0, 1, 0.7, 1, 0], opacity: [0, 1, 0.7, 1, 0], rotate: 180 }}
          transition={{
            duration: 2.2,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: s.repeatDelay,
            ease: 'easeInOut',
          }}
        >
          <Sparkle className="w-full h-full" />
        </motion.div>
      ))}
    </>
  );
}

function TrophySvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <defs>
        <linearGradient id="tc-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="color-mix(in oklab, var(--gold) 35%, white)" />
          <stop offset="35%" stopColor="var(--gold)" />
          <stop offset="75%" stopColor="color-mix(in oklab, var(--gold) 45%, var(--wood))" />
          <stop offset="100%" stopColor="var(--wood)" />
        </linearGradient>
        <linearGradient id="tc-gold-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="color-mix(in oklab, var(--gold) 60%, white)" />
          <stop offset="50%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--wood)" />
        </linearGradient>
        <linearGradient id="tc-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--washi)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--washi)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path
        d="M 28 32 Q 6 32 8 60 Q 10 82 32 86"
        fill="none"
        stroke="url(#tc-gold)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M 92 32 Q 114 32 112 60 Q 110 82 88 86"
        fill="none"
        stroke="url(#tc-gold)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Cup */}
      <path d="M 25 18 L 95 18 L 95 50 Q 95 90 60 100 Q 25 90 25 50 Z" fill="url(#tc-gold)" />
      {/* Shine */}
      <path d="M 33 22 Q 32 60 42 88 L 38 88 Q 30 60 31 22 Z" fill="url(#tc-shine)" />
      {/* Rim */}
      <ellipse
        cx="60"
        cy="19"
        rx="36"
        ry="4.5"
        fill="color-mix(in oklab, var(--gold) 50%, white)"
      />
      <ellipse
        cx="60"
        cy="19"
        rx="36"
        ry="4.5"
        fill="none"
        stroke="var(--wood)"
        strokeWidth="0.6"
        opacity="0.35"
      />
      {/* Star */}
      <path
        d="M 60 42 L 63.6 52.3 L 74.5 52.3 L 65.7 58.7 L 69 69 L 60 62.7 L 51 69 L 54.3 58.7 L 45.5 52.3 L 56.4 52.3 Z"
        fill="var(--washi)"
        opacity="0.92"
      />
      {/* Stem */}
      <path d="M 52 100 L 68 100 L 66 116 L 54 116 Z" fill="url(#tc-gold)" />
      {/* Base tiers */}
      <rect x="40" y="116" width="40" height="7" rx="2" fill="url(#tc-gold-light)" />
      <rect x="32" y="123" width="56" height="9" rx="2" fill="url(#tc-gold)" />
      <rect x="28" y="132" width="64" height="6" rx="3" fill="url(#tc-gold-light)" />
    </svg>
  );
}

function AnimatedCounter({
  value,
  delay = 0,
  duration = 0.9,
}: {
  value: number;
  delay?: number;
  duration?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const controls = animate(0, value, {
      delay,
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => {
      controls.stop();
      // Land on the real number rather than wherever the animation was cut
      // off. An interrupted count-up used to leave the card reading 0, which
      // is not a slower truth but a wrong one.
      setDisplay(value);
    };
  }, [value, delay, duration, prefersReducedMotion]);

  return <>{prefersReducedMotion ? value : display}</>;
}

function QuizRing({
  pct,
  delay = 0,
  compact = false,
}: {
  pct: number;
  delay?: number;
  compact?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const size = compact ? 64 : 88;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="tc-ring-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--shu)" />
          </linearGradient>
        </defs>
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-[var(--washi-deep)]"
        />
        <motion.circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="url(#tc-ring-gold)"
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1.1,
            delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-xl font-bold text-[var(--shu)]">
          <AnimatedCounter value={pct} delay={delay} duration={1.0} />
          <span className="text-sm font-bold">%</span>
        </span>
      </div>
    </div>
  );
}

interface ClassroomCompletePageProps {
  readonly scenes: Scene[];
  readonly title: string;
  /** Design-preview overrides: skip the stored answers and the LLM request. */
  readonly insightsOverride?: InsightCategory[];
  readonly quizOverride?: { correct: number; total: number; pct: number };
}

export function ClassroomCompletePage({
  scenes,
  title,
  insightsOverride,
  quizOverride,
}: ClassroomCompletePageProps) {
  const { t, locale } = useI18n();
  const prefersReducedMotion = useReducedMotion();

  const [resolvedSummary, setResolvedSummary] = useState(() => ({
    scenes,
    summary: pendingCompleteSummary(scenes),
  }));
  const resolved = completeSummaryForScenes(scenes, resolvedSummary);
  const summary = quizOverride ? { ...resolved, quiz: quizOverride } : resolved;

  useEffect(() => {
    let cancelled = false;
    void summarizeScenes(scenes, async (sceneId) => {
      const scene = scenes.find((candidate) => candidate.id === sceneId);
      try {
        return await readSceneQuizAnswers(scene, loadQuizAttemptState);
      } catch (error) {
        log.warn(`Failed to load quiz summary for scene ${sceneId}:`, error);
        return undefined;
      }
    }).then((next) => {
      if (!cancelled) setResolvedSummary({ scenes, summary: next });
    });
    return () => {
      cancelled = true;
    };
  }, [scenes]);

  // Topic breakdown for the radar. The LLM groups the graded questions, which
  // takes a model round trip, so the scene-title grouping is drawn immediately
  // and the model's topics crossfade over it when they land. Waiting instead
  // would leave the card empty for seconds and then pop a chart into a page
  // the learner is already reading.
  const [llmInsights, setLlmInsights] = useState<InsightCategory[]>([]);
  const quizResults = summary.results;
  // Not memoized by hand: the React Compiler cannot preserve a memo keyed on
  // this array, and the grouping is a single pass over the graded answers.
  const insights =
    insightsOverride ?? (llmInsights.length > 0 ? llmInsights : fallbackCategories(quizResults));
  useEffect(() => {
    if (insightsOverride) return;
    if (quizResults.length === 0) return;
    const controller = new AbortController();
    void fetchInsightCategories(
      { courseTitle: title, language: locale, results: quizResults },
      controller.signal,
    ).then((categories) => {
      if (!controller.signal.aborted) setLlmInsights(categories);
    });
    return () => controller.abort();
  }, [quizResults, title, locale, insightsOverride]);

  const showRadar = hasEnoughAxes(insights);

  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [locale]);

  const trailItems = TYPE_ORDER.filter((type) => (summary.countsByType[type] ?? 0) > 0).map(
    (type) => ({
      type,
      count: summary.countsByType[type] ?? 0,
      Icon: SCENE_TYPE_ICONS[type],
      label: t(`classroomComplete.trailLabels.${type}`),
    }),
  );

  // Adaptive compact mode. The complete page lives inside the `<Stage>`
  // viewport — when that viewport is short (a small window, or the stage
  // embedded in a thin column), the full layout overflows. A centered flex
  // container that overflows clips its top half beyond the scroll origin, so
  // the trophy becomes unreachable; swapping to a `compact` token before that
  // happens keeps the whole page reachable without scrolling.
  //
  // The decision is measured, not guessed at with a fixed pixel threshold.
  // Content height is not constant here: the topic breakdown appears only for
  // courses with a quiz, its chart is taller than its bar fallback, and the
  // row count follows the topic count. A hard-coded "full layout needs 760px"
  // was calibrated before the breakdown existed and silently stopped being
  // true once it shipped.
  //
  // Measuring naively would oscillate — compact content fits, so it would
  // flip back to full, overflow, and flip again every frame. The fix is to
  // remember how tall the content was the last time it rendered full, and
  // require that much room again before leaving compact:
  //   - in full: overflow the container → go compact, remembering that height
  //   - in compact: only return to full once the container clears the
  //     remembered full height plus a margin
  const sectionRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const fullContentHeight = useRef<number>(0);
  const [compact, setCompact] = useState(false);
  const [scale, setScale] = useState(1);
  // Scaled content keeps its unscaled layout box, so the scroll layer would
  // report an overflow the viewer no longer has. Scrolling is enabled only
  // when the scale floor was hit and something is genuinely out of view.
  const [fits, setFits] = useState(true);
  // The column's unscaled height, kept so the scroll track can be sized to
  // what is actually drawn rather than to the layout box behind it.
  const [naturalHeight, setNaturalHeight] = useState(0);
  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;
    // Enough to clear a rounding difference without inviting a flip-flop.
    const MARGIN = 24;
    const measure = () => {
      const availableHeight = section.clientHeight;
      const availableWidth = section.clientWidth;
      // offsetWidth/offsetHeight are layout sizes, which a CSS transform does
      // not affect — so reading them back while scaled cannot feed into
      // itself.
      const naturalHeight = content.offsetHeight;
      const naturalWidth = content.offsetWidth;
      setCompact((prev) => {
        if (prev) return availableHeight < fullContentHeight.current + MARGIN;
        fullContentHeight.current = naturalHeight;
        return naturalHeight > availableHeight;
      });
      if (naturalHeight > 0 && naturalWidth > 0) {
        const next = Math.max(
          MIN_FIT_SCALE,
          Math.min(
            MAX_FIT_SCALE,
            (availableHeight - FIT_INSET) / naturalHeight,
            (availableWidth - FIT_INSET) / naturalWidth,
          ),
        );
        setScale(next);
        setFits(naturalHeight * next <= availableHeight + 1);
        setNaturalHeight(naturalHeight);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? 'always' : 'user'}>
      {/* Layering:
          - outer <section> is the viewport-sized stage; it owns the
            absolute-positioned decorative layers (background gradient,
            radial glow, confetti) and stays overflow-hidden so the
            sparkles/confetti that intentionally overshoot don't make a
            scrollbar appear.
          - inside, an absolutely-positioned scroll container owns the
            content. The scroll container is overflow-y:auto so when content
            is taller than the section the user can scroll, but because the
            decorative layers live *outside* this scroll container they
            stay pinned to the viewport instead of extending below the
            content (which previously caused a large empty area below the
            content — gradients followed the scroll height).
          - inside the scroll container, a flex wrapper with min-h-full +
            items-center keeps content vertically centered when it fits,
            and expands past min-height when content overflows (which gives
            natural scrolling without trailing whitespace). Note the wrapper
            itself must not be the scroll container: a centered flex child
            that overflows is clipped beyond the scroll origin at the top,
            which is exactly what the compact token above avoids, and the
            scroll layer keeps that path degenerate. */}
      <section
        ref={sectionRef}
        className="absolute inset-0 z-[105] overflow-hidden"
        aria-label={t('classroomComplete.title')}
      >
        {/* Single-shot announcement for screen readers — replaces the noisy
            outer aria-live region that used to wrap the live-updating counters. */}
        <span className="sr-only" role="status">
          {t('classroomComplete.title')}
        </span>
        {/* Base background — pinned to the section, NOT to scroll height */}
        <div className="dojo-paper absolute inset-0" />
        {/* Radial glow — same, pinned to section */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--gold) 30%, transparent), color-mix(in oklab, var(--shu) 12%, transparent) 38%, transparent 68%)',
          }}
        />
        {/* Confetti — pinned to section */}
        <Confetti />

        {/* Scroll layer: only this part scrolls, and only when scaling alone
            could not make the content fit. */}
        <div
          className={cn(
            'absolute inset-0 overflow-x-hidden',
            fits ? 'overflow-y-hidden' : 'overflow-y-auto',
          )}
        >
          <div className="min-h-full flex items-center justify-center">
            {/* Scroll track. A scaled element keeps its unscaled layout box,
                so without this the scrollable range was the full-size height
                while only the scaled height was drawn — scrolling ran off the
                end of the content into empty space. Sized only while
                scrolling is in play; the height is never read back into the
                measurement, which reads the column inside it. */}
            <div
              // items-start matters: a stretching flex child would take the
              // track's height, and that height is derived from the child's
              // own measurement — the column would measure itself.
              className="w-full flex items-start justify-center"
              style={fits ? undefined : { height: Math.round(naturalHeight * scale) }}
            >
              {/* Content. Scaled to fill the stage: two spacing tiers cannot
                cover every viewport this page is embedded in — the classroom
                stage is far shorter than a full window — so after the compact
                token has done what it can, the whole column is scaled to the
                room that is actually there. Scaling up as well as down keeps
                the page filling the stage instead of floating in it. */}
              <div
                ref={contentRef}
                style={{
                  transform: `scale(${scale})`,
                  // Centred while it fits, so the page sits in the middle of the
                  // stage. Once the scale floor is reached and scrolling takes
                  // over, anchoring to the top is what makes the scroll usable:
                  // a centred origin pushes the trophy up behind the scroll
                  // origin, where it cannot be reached.
                  transformOrigin: fits ? 'center center' : 'top center',
                }}
                className={cn(
                  'relative flex flex-col items-center max-w-3xl w-full',
                  compact ? 'gap-2 px-6 py-3' : 'gap-5 px-8 py-6',
                )}
              >
                {/* Trophy + halo + sparkles */}
                <div
                  className="relative"
                  style={{ width: compact ? 88 : 168, height: compact ? 88 : 168 }}
                >
                  <motion.div
                    aria-hidden
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: [0.9, 1.15, 0.95, 1.1], opacity: [0, 0.55, 0.4, 0.5] }}
                    transition={{
                      delay: 0.15,
                      duration: 2.6,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'radial-gradient(circle, color-mix(in oklab, var(--gold) 45%, transparent), color-mix(in oklab, var(--shu) 12%, transparent) 55%, transparent 72%)',
                      filter: 'blur(14px)',
                    }}
                  />
                  <motion.div
                    aria-hidden
                    initial={{ y: 44, scale: 0.4, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        width: compact ? 66 : 124,
                        height: compact ? 82 : 155,
                      }}
                    >
                      <TrophySvg className="w-full h-full drop-shadow-[0_10px_18px_color-mix(in_oklab,var(--wood)_45%,transparent)]" />
                    </motion.div>
                  </motion.div>
                  {!compact && <Sparkles />}
                </div>

                {/* Ribbon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.65, type: 'spring', stiffness: 280, damping: 18 }}
                  className={cn(
                    'dojo-seal inline-flex items-center gap-1.5 font-bold uppercase',
                    compact ? 'px-3 py-1 text-[10px]' : 'px-4 py-1.5 text-xs',
                  )}
                >
                  <Sparkle className="w-3 h-3" />
                  {t('classroomComplete.title')}
                  <Sparkle className="w-3 h-3" />
                </motion.div>

                {/* Title + date */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.78, duration: 0.4, ease: 'easeOut' }}
                  className={cn('text-center', compact ? 'space-y-0.5' : 'space-y-1.5')}
                >
                  <h2
                    className={cn(
                      'dojo-heading font-bold leading-tight text-foreground',
                      compact ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl',
                    )}
                  >
                    {title || t('classroomComplete.title')}
                  </h2>
                  {/* Brush-stroke rule, as under the home page's headings. */}
                  <div aria-hidden className={cn('dojo-rule mx-auto', compact ? 'w-16' : 'w-24')} />
                  <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
                    {dateLabel}
                  </p>
                </motion.div>

                {/* Stats cards */}
                {trailItems.length > 0 && (
                  <div
                    className={cn(
                      'grid w-full',
                      compact ? 'gap-2' : 'gap-3',
                      trailItems.length === 1 && 'grid-cols-1 max-w-[180px]',
                      trailItems.length === 2 && 'grid-cols-2 max-w-md',
                      trailItems.length === 3 && 'grid-cols-3',
                      trailItems.length === 4 && 'grid-cols-2 sm:grid-cols-4',
                    )}
                  >
                    {trailItems.map(({ type, count, Icon, label }, idx) => {
                      const cardDelay = 0.96 + idx * 0.08;
                      return (
                        <motion.div
                          key={type}
                          initial={{ opacity: 0, y: 14, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            delay: cardDelay,
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                          }}
                          className={cn(
                            'dojo-frame rounded-sm bg-card flex flex-col items-center',
                            compact ? 'px-3 py-1.5 gap-0.5' : 'px-4 py-3 gap-1.5',
                          )}
                        >
                          <Icon
                            className={cn('text-[var(--shu)]', compact ? 'w-4 h-4' : 'w-6 h-6')}
                            strokeWidth={1.8}
                          />
                          <div
                            className={cn(
                              'font-serif font-bold text-foreground leading-none',
                              compact ? 'text-xl' : 'text-3xl',
                            )}
                          >
                            <AnimatedCounter value={count} delay={cardDelay + 0.15} />
                          </div>
                          <div
                            className={cn(
                              'text-muted-foreground uppercase tracking-wider',
                              compact ? 'text-[10px]' : 'text-[11px]',
                            )}
                          >
                            {label}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Results card — score summary on the left, topic radar on the
                  right. The radar only appears once the breakdown has at
                  least three axes; below that a radar reads as noise. */}
                {summary.quiz && (
                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1.2, type: 'spring', stiffness: 220, damping: 20 }}
                    className={cn(
                      'dojo-frame w-full rounded-sm bg-card',
                      compact ? 'px-4 py-3' : 'px-6 py-4',
                    )}
                  >
                    <div className={cn('flex flex-col', compact ? 'gap-2.5' : 'gap-4')}>
                      <div className={cn('flex items-center', compact ? 'gap-3' : 'gap-5')}>
                        <QuizRing pct={summary.quiz.pct} delay={1.3} compact={compact} />
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              'font-serif font-bold text-foreground',
                              compact ? 'text-sm' : 'text-base',
                            )}
                          >
                            {t('classroomComplete.quizScoreLabel', {
                              correct: summary.quiz.correct,
                              total: summary.quiz.total,
                            })}
                          </div>
                          <div
                            className={cn(
                              'mt-1 text-muted-foreground',
                              compact ? 'text-xs' : 'text-sm',
                            )}
                          >
                            {t(
                              `classroomComplete.encouragement.${encouragementKey(summary.quiz.pct)}`,
                            )}
                          </div>
                        </div>
                      </div>

                      {insights.length > 0 && (
                        <div
                          className={cn(
                            'border-t border-[color-mix(in_oklab,var(--wood)_18%,transparent)]',
                            compact ? 'pt-2.5' : 'pt-4',
                          )}
                        >
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {t('classroomComplete.topicBreakdown')}
                          </div>
                          <div
                            className={cn(
                              'mt-1.5 flex items-center',
                              // Side by side when there is a chart: the radar is
                              // square and the list is short, so stacking them
                              // spent height the viewport did not have while
                              // leaving the card's width empty either side.
                              // Without a chart the bars want the full width.
                              showRadar ? 'flex-row' : 'flex-col',
                              compact ? 'gap-2' : 'gap-5',
                            )}
                          >
                            {showRadar && (
                              <CompleteRadar
                                categories={insights}
                                compact={compact}
                                goalLabel={t('classroomComplete.radarGoal')}
                                ariaLabel={t('classroomComplete.radarLabel', {
                                  scores: insights
                                    .map((category) => `${category.label} ${category.score}%`)
                                    .join(', '),
                                })}
                              />
                            )}
                            {/* The same numbers as text, beside the chart: the
                              chart is never the only way to read a score, and
                              the list carries the untruncated topic names the
                              radar captions have to shorten.

                              Below three axes there is no chart at all — a one-
                              or two-sided polygon is not a shape anyone can
                              read — so each row grows a bar instead. The score
                              still gets a visual length, which is all a radar
                              was giving it. */}
                            <ul
                              className={cn(
                                'min-w-0 flex-1 grid grid-cols-1',
                                showRadar ? 'gap-y-1' : 'w-full gap-y-3',
                              )}
                            >
                              {insights.map((category, index) => (
                                <li key={category.label} className="min-w-0 text-xs">
                                  <div className="flex items-baseline justify-between gap-3">
                                    <span className="truncate text-foreground">
                                      {category.label}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                                      <span className="font-serif font-bold text-foreground">
                                        {category.score}%
                                      </span>{' '}
                                      {t(`classroomComplete.rating.${ratingKey(category.score)}`)}
                                    </span>
                                  </div>
                                  {!showRadar && (
                                    <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--wood)_14%,transparent)]">
                                      <motion.div
                                        className="h-full rounded-full bg-[var(--shu)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${category.score}%` }}
                                        transition={{
                                          duration: prefersReducedMotion ? 0 : 0.6,
                                          delay: prefersReducedMotion ? 0 : 1.4 + index * 0.1,
                                          ease: [0.16, 1, 0.3, 1],
                                        }}
                                      />
                                      {/* The same 85% the radar draws as a ring. */}
                                      <div
                                        className="absolute inset-y-0 w-px bg-[var(--gold)]"
                                        style={{ left: '85%' }}
                                        aria-hidden
                                      />
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}

export function ClassroomCompletePageConnected() {
  const stage = useStageStore((s) => s.stage);
  const scenes = useStageStore((s) => s.scenes);
  return <ClassroomCompletePage scenes={scenes} title={stage?.name ?? ''} />;
}
