'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import type { DojoSource } from '@/teams/shared/contracts/dojo-source';
import { createAppSource } from './app-source';

const defaultSource = createAppSource();
const DojoSourceContext = createContext<DojoSource>(defaultSource);

/** Screens default to the app source (demo tower + live classrooms); wrap a subtree to swap it. */
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
  | { status: 'generating'; progress: number }
  | { status: 'failed'; error: string }
  | { status: 'missing' }
  | { status: 'error'; error: Error };

/** The Backend asks to be polled every 5 s while a classroom generates. */
const GENERATION_POLL_MS = 5000;

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
    const load = async (): Promise<DojoLoadState> => {
      const dojo = await source.getDojo(dojoId);
      if (dojo) {
        if (!loadedDojos.has(source)) loadedDojos.set(source, new Map());
        loadedDojos.get(source)!.set(dojoId, dojo);
        return { status: 'ready', dojo };
      }
      const status = await source.getStatus(dojoId);
      if (status.status === 'generating') return status;
      if (status.status === 'failed') return status;
      // `ready` here means it finished between the two calls: load again right away.
      if (status.status === 'ready') return { status: 'generating', progress: 100 };
      return { status: 'missing' };
    };
    load().then(settle, (error: unknown) =>
      settle({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      cancelled = true;
    };
  }, [source, dojoId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  let state: DojoLoadState = { status: 'loading' };
  if (cached) {
    state = { status: 'ready', dojo: cached };
  } else if (settled && settled.source === source && settled.dojoId === dojoId) {
    // While the next poll is in flight, keep showing the generation progress.
    if (settled.attempt === attempt || settled.state.status === 'generating') {
      state = settled.state;
    }
  }

  const polling = state.status === 'generating' && settled?.attempt === attempt;
  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => setAttempt((value) => value + 1), GENERATION_POLL_MS);
    return () => clearTimeout(timer);
  }, [polling]);

  return { ...state, retry };
}
