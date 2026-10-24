'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { InsightCategory } from '@/lib/classroom/insights';

/**
 * The viewBox is measured from the drawing, not fixed.
 *
 * A fixed square box is wrong at both ends: too tight and the side captions
 * clip mid-word ("vel-Des…"), too loose and a 3-axis triangle — which is wide
 * and short — floats in a tall empty box, pushing the score list far below the
 * chart it belongs to. Measuring the captions instead means every axis count
 * gets a box that fits it.
 */
const CENTER = 180;
const RADIUS = 92;
/** Where captions sit, outside the outer ring. */
const CAPTION_RADIUS = 112;
/** Where the numbered markers sit when captions are too small to read. */
const MARKER_RADIUS = 106;
/** Caption glyphs average a little over half the font size in width. */
const CAPTION_CHAR_WIDTH = 5.6;
const CAPTION_FONT_SIZE = 11;
const BOX_PADDING = 6;
const RINGS = [100, 75, 50, 25];
/** The 85% band the learning-insights design doc marks as "excelling". */
const GOAL = 85;

function point(index: number, count: number, value: number): [number, number] {
  const angle = ((index * 360) / count - 90) * (Math.PI / 180);
  const r = (value / 100) * RADIUS;
  return [CENTER + Math.cos(angle) * r, CENTER + Math.sin(angle) * r];
}

function captionPoint(index: number, count: number): [number, number] {
  const angle = ((index * 360) / count - 90) * (Math.PI / 180);
  return [CENTER + Math.cos(angle) * CAPTION_RADIUS, CENTER + Math.sin(angle) * CAPTION_RADIUS];
}

/**
 * The box the drawing actually occupies: the rings, plus each caption's own
 * horizontal run from its anchor. Returned as a viewBox string.
 */
function contentBox(labels: string[], withCaptions: boolean): string {
  const count = labels.length;
  // The markers sit outside the ring in both modes; captions are wide and
  // need measuring, index numbers are a fixed glyph or two.
  const marker = withCaptions ? 0 : MARKER_RADIUS - RADIUS + CAPTION_FONT_SIZE;
  let minX = CENTER - RADIUS - marker;
  let maxX = CENTER + RADIUS + marker;
  let minY = CENTER - RADIUS - marker;
  let maxY = CENTER + RADIUS + marker;

  if (withCaptions)
    labels.forEach((label, index) => {
      const [x, y] = captionPoint(index, count);
      const width = label.length * CAPTION_CHAR_WIDTH;
      const anchor = anchorFor(x);
      const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
      const right = left + width;
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, y - CAPTION_FONT_SIZE);
      maxY = Math.max(maxY, y + CAPTION_FONT_SIZE);
    });

  const x0 = minX - BOX_PADDING;
  const y0 = minY - BOX_PADDING;
  return `${x0} ${y0} ${maxX - minX + BOX_PADDING * 2} ${maxY - minY + BOX_PADDING * 2}`;
}

function markerPoint(index: number, count: number): [number, number] {
  const angle = ((index * 360) / count - 90) * (Math.PI / 180);
  return [CENTER + Math.cos(angle) * MARKER_RADIUS, CENTER + Math.sin(angle) * MARKER_RADIUS];
}

function polygon(values: number[]): string {
  return values.map((value, index) => point(index, values.length, value).join(',')).join(' ');
}

/** Caption anchoring follows the axis side so labels never overlap the web. */
function anchorFor(x: number): 'start' | 'middle' | 'end' {
  if (x > CENTER + 6) return 'start';
  if (x < CENTER - 6) return 'end';
  return 'middle';
}

interface CompleteRadarProps {
  readonly categories: InsightCategory[];
  readonly goalLabel: string;
  readonly ariaLabel: string;
  readonly compact?: boolean;
}

/**
 * Topic radar for the completion page. The axis count follows the category
 * count (3–8, clamped in `lib/classroom/insights`), so a course with more
 * topics simply gets more angles.
 *
 * Colour alone never carries meaning here: the scores are also listed as text
 * beneath the chart by the caller, and the whole SVG exposes them in its label.
 *
 * Two different entrances, on purpose. The first chart a learner sees is built
 * in stages — rings, then axes, then the score shape, then the vertices —
 * because watching it assemble explains what the shape is measured against.
 * Every later chart (the scene-title fallback being replaced by the model's
 * topics) only crossfades: replaying the build would announce the swap instead
 * of hiding it, and the axis count usually changes, so there is nothing to
 * morph between.
 */
export function CompleteRadar({ categories, goalLabel, ariaLabel, compact }: CompleteRadarProps) {
  const prefersReducedMotion = useReducedMotion();
  const count = categories.length;
  const scores = categories.map((category) => category.score);
  const signature = categories.map((category) => `${category.label}:${category.score}`).join('|');

  // Which entrance this render gets. The initializer runs once, so the first
  // signature this component ever saw is captured for the life of the mount;
  // anything else is a swap and only crossfades.
  const [firstSignature] = useState(signature);
  const staged = signature === firstSignature;
  // Captions are dropped where they would render too small to read: the
  // compact layout puts the chart beside the score list, which already names
  // every topic in full, so the chart there is the shape and the list is the
  // label. The aria-label carries both regardless.
  const withCaptions = !compact;
  const viewBox = contentBox(
    categories.map((category) => category.label),
    withCaptions,
  );
  const [boxX, boxY, , boxHeight] = viewBox.split(' ').map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const legendX = boxX + 2;
  const legendY = boxY + boxHeight - 6;

  const duration = (seconds: number) => (prefersReducedMotion ? 0 : seconds);
  const delay = (seconds: number) => (prefersReducedMotion || !staged ? 0 : seconds);

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full shrink-0"
      style={{ maxWidth: compact ? 210 : 300 }}
    >
      <AnimatePresence mode="wait">
        <motion.g
          key={signature}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration(staged ? 0.2 : 0.35) }}
        >
          {/* Stage 1 — the scale the shape will be read against. */}
          {RINGS.map((ring, index) => (
            <motion.polygon
              key={ring}
              points={polygon(Array(count).fill(ring))}
              fill={
                ring === 100 ? 'color-mix(in oklab, var(--washi-deep) 45%, transparent)' : 'none'
              }
              stroke="color-mix(in oklab, var(--wood) 22%, transparent)"
              strokeWidth="1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: duration(0.3), delay: delay(index * 0.06) }}
            />
          ))}

          {/* Stage 2 — the axes draw outward from the centre. */}
          {categories.map((category, index) => {
            const [x, y] = point(index, count, 100);
            return (
              <motion.line
                key={`axis-${category.label}`}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="color-mix(in oklab, var(--wood) 18%, transparent)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: duration(0.4), delay: delay(0.25 + index * 0.04) }}
              />
            );
          })}

          <motion.polygon
            points={polygon(Array(count).fill(GOAL))}
            fill="none"
            stroke="var(--gold)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: duration(0.3), delay: delay(0.5) }}
          />

          {/* Stage 3 — the score shape sweeps out of the centre. */}
          <motion.polygon
            points={polygon(scores)}
            fill="var(--shu)"
            fillOpacity="0.2"
            stroke="var(--shu)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: duration(0.6),
              delay: delay(0.6),
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />

          {/* Stage 4 — the vertices land one after another. */}
          {categories.map((category, index) => {
            const [x, y] = point(index, count, category.score);
            return (
              <motion.circle
                key={`dot-${category.label}`}
                cx={x}
                cy={y}
                r="3.5"
                fill="var(--shu)"
                stroke="var(--washi)"
                strokeWidth="1.5"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 18,
                  duration: duration(0.25),
                  delay: delay(0.9 + index * 0.05),
                }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              />
            );
          })}

          {withCaptions &&
            categories.map((category, index) => {
              const [x, y] = captionPoint(index, count);
              return (
                <motion.text
                  key={`label-${category.label}`}
                  x={x}
                  y={y}
                  textAnchor={anchorFor(x)}
                  dominantBaseline="middle"
                  fill="var(--muted-foreground, currentColor)"
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="inherit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: duration(0.3), delay: delay(0.75 + index * 0.04) }}
                >
                  {category.label}
                </motion.text>
              );
            })}

          {/* Without captions the axes would be anonymous: these numbers key
              each vertex to its row in the score list beside the chart. Two
              digits stay legible at a scale where a topic name would not. */}
          {!withCaptions &&
            categories.map((category, index) => {
              const [x, y] = markerPoint(index, count);
              return (
                <motion.g
                  key={`marker-${category.label}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: duration(0.3), delay: delay(0.75 + index * 0.04) }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="8.5"
                    fill="color-mix(in oklab, var(--washi-deep) 70%, transparent)"
                    stroke="color-mix(in oklab, var(--wood) 24%, transparent)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--muted-foreground, currentColor)"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="inherit"
                  >
                    {index + 1}
                  </text>
                </motion.g>
              );
            })}

          {/* A legend in the corner of the box, not a tag on the ring: on the
              plot it landed on top of the score shape whenever the top axis
              scored near the goal. */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: duration(0.3), delay: delay(0.55) }}
          >
            <line
              x1={legendX}
              y1={legendY}
              x2={legendX + 14}
              y2={legendY}
              stroke="var(--gold)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <text
              x={legendX + 19}
              y={legendY}
              dominantBaseline="middle"
              fontSize="9"
              fill="var(--gold)"
              fontFamily="inherit"
            >
              {goalLabel}
            </text>
          </motion.g>
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}
