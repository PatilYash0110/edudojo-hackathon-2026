'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  advanceDojoProgress,
  createDojoProgress,
  type DojoProgress,
  type DojoProgressEvent,
} from '@/teams/game/progression/unlocks';

const STORAGE_VERSION = 1;

function storageKey(dojoId: string) {
  return `edudojo:progress:v${STORAGE_VERSION}:${dojoId}`;
}

function isStoredProgress(value: unknown, floorCount: number): value is DojoProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<DojoProgress>;
  return (
    progress.floorCount === floorCount &&
    typeof progress.currentFloor === 'number' &&
    progress.currentFloor >= 1 &&
    progress.currentFloor <= floorCount &&
    ['lesson', 'battle', 'boss', 'complete'].includes(progress.stage ?? '')
  );
}

/** Saved progress for a dojo, or a fresh start; for screens that only read it (the dojo list). */
export function readDojoProgress(dojoId: string, floorCount: number): DojoProgress {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(dojoId)) ?? 'null');
    if (isStoredProgress(stored, floorCount)) return stored;
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
  return createDojoProgress(floorCount);
}

/** Where "continue" goes: the open lesson or battle, the boss, or the tower once mastered. */
export function resumePath(dojoId: string, floorIds: string[], progress: DojoProgress): string {
  const base = `/dojo/${encodeURIComponent(dojoId)}`;
  const floorId = floorIds[progress.currentFloor - 1];
  if (progress.stage === 'boss') return `${base}/boss`;
  if (progress.stage === 'complete' || !floorId) return base;
  return progress.stage === 'battle'
    ? `${base}/floor/${floorId}/battle`
    : `${base}/floor/${floorId}`;
}

export function useDojoProgress(dojoId: string, floorCount: number) {
  const [progress, setProgress] = useState<DojoProgress>(() => createDojoProgress(floorCount));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read after hydration, but not on an animation frame: a background tab would delay it.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setProgress(readDojoProgress(dojoId, floorCount));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [dojoId, floorCount]);

  const advance = useCallback(
    (event: DojoProgressEvent) => {
      setProgress((current) => {
        const next = advanceDojoProgress(current, event);
        localStorage.setItem(storageKey(dojoId), JSON.stringify(next));
        return next;
      });
    },
    [dojoId],
  );

  const reset = useCallback(() => {
    const next = createDojoProgress(floorCount);
    localStorage.setItem(storageKey(dojoId), JSON.stringify(next));
    setProgress(next);
  }, [dojoId, floorCount]);

  return { progress, ready, advance, reset };
}
