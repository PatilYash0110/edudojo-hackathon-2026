'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import type { DojoSource } from '@/teams/shared/contracts/dojo-source';
import { createDemoSource } from './demo-source';

const defaultSource = createDemoSource();
const DojoSourceContext = createContext<DojoSource>(defaultSource);

/** Screens default to the demo source; wrap a subtree to swap in the live source. */
export function DojoSourceProvider({
  source,
  children,
}: {
  source: DojoSource;
  children: ReactNode;
}) {
  return <DojoSourceContext.Provider value={source}>{children}</DojoSourceContext.Provider>;
}

export function useDojoSource(): DojoSource {
  return useContext(DojoSourceContext);
}

export type DojoLoadState =
  | { status: 'loading' }
  | { status: 'ready'; dojo: Dojo }
  | { status: 'missing' }
  | { status: 'error'; error: Error };

// Loaded dojos are kept per source so moving between tower, lesson, and battle never flashes.
const loadedDojos = new WeakMap<DojoSource, Map<string, Dojo>>();

function cachedDojo(source: DojoSource, dojoId: string): Dojo | undefined {
  return loadedDojos.get(source)?.get(dojoId);
}

type SettledLoad = { source: DojoSource; dojoId: string; attempt: number; state: DojoLoadState };

export function useDojo(dojoId: string): DojoLoadState & { retry: () => void } {
  const source = useDojoSource();
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledLoad | null>(null);
  const cached = cachedDojo(source, dojoId);

  useEffect(() => {
    if (cachedDojo(source, dojoId)) return;

    let cancelled = false;
    const settle = (state: DojoLoadState) => {
      if (!cancelled) setSettled({ source, dojoId, attempt, state });
    };
    source.getDojo(dojoId).then(
      (dojo) => {
        if (!dojo) return settle({ status: 'missing' });
        if (!loadedDojos.has(source)) loadedDojos.set(source, new Map());
        loadedDojos.get(source)!.set(dojoId, dojo);
        settle({ status: 'ready', dojo });
      },
      (error: unknown) =>
        settle({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [source, dojoId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  let state: DojoLoadState = { status: 'loading' };
  if (cached) {
    state = { status: 'ready', dojo: cached };
  } else if (
    settled &&
    settled.source === source &&
    settled.dojoId === dojoId &&
    settled.attempt === attempt
  ) {
    state = settled.state;
  }
  return { ...state, retry };
}
