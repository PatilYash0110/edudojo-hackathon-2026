'use client';

/**
 * What the learner remembers of each objective, per dojo, kept in this browser.
 * The forgetting-curve rules live in `teams/game/mastery/decay.ts`; this file only stores.
 * TODO(Backend): mirror into `dojo_mastery` (it already has `updated_at`) so it follows the learner.
 */
import { useEffect, useState } from 'react';
import {
  rememberMissing,
  reviewObjectives,
  type DojoMemory,
  type ReviewAnswer,
} from '@/teams/game/mastery/decay';

const STORAGE_VERSION = 1;
const REFRESH_MS = 60_000;

function storageKey(dojoId: string) {
  return `edudojo:memory:v${STORAGE_VERSION}:${dojoId}`;
}

function isDojoMemory(value: unknown): value is DojoMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      Number.isFinite((entry as { lastReviewedAt?: unknown }).lastReviewedAt) &&
      Number.isFinite((entry as { stabilityDays?: unknown }).stabilityDays) &&
      (entry as { stabilityDays: number }).stabilityDays > 0,
  );
}

export function readDojoMemory(dojoId: string): DojoMemory {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(dojoId)) ?? 'null');
    if (isDojoMemory(stored)) return stored;
  } catch {
    // Unreadable or blocked storage: nothing remembered.
  }
  return {};
}

function writeDojoMemory(dojoId: string, memory: DojoMemory) {
  try {
    localStorage.setItem(storageKey(dojoId), JSON.stringify(memory));
  } catch {
    // Blocked storage: decay simply does not persist in this browser.
  }
}

/** After a won battle on these objectives (first clear, rematch or boss). */
export function recordReview(
  dojoId: string,
  objectiveIds: readonly string[],
  answers: readonly ReviewAnswer[],
  now = Date.now(),
): DojoMemory {
  const next = reviewObjectives(readDojoMemory(dojoId), objectiveIds, answers, now);
  writeDojoMemory(dojoId, next);
  return next;
}

/** Restarting a dojo forgets it too. */
export function forgetDojo(dojoId: string) {
  try {
    localStorage.removeItem(storageKey(dojoId));
  } catch {
    // Nothing to clear.
  }
}

/**
 * Memory for the tower map. Objectives of floors that are already cleared but have no record
 * (cleared before decay existed) start fresh now. `now` refreshes every minute so floors fade
 * while the map is open.
 */
export function useDojoMemory(dojoId: string, clearedObjectiveIds: readonly string[]) {
  const [state, setState] = useState<{ memory: DojoMemory; now: number; ready: boolean }>({
    memory: {},
    now: 0,
    ready: false,
  });
  const clearedKey = clearedObjectiveIds.join('|');

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const now = Date.now();
      const stored = readDojoMemory(dojoId);
      const memory = rememberMissing(stored, clearedKey ? clearedKey.split('|') : [], now);
      if (memory !== stored) writeDojoMemory(dojoId, memory);
      setState({ memory, now, ready: true });
    });
    const timer = window.setInterval(() => {
      setState((current) => ({ ...current, now: Date.now() }));
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [dojoId, clearedKey]);

  return state;
}
