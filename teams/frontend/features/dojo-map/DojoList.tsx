'use client';

/**
 * My dojos: every dojo this learner started, each with one "Continue" that lands on the exact
 * lesson, battle or boss they left, plus a way to start a new topic. Always reachable from the nav.
 *
 * OWNER: FRONTEND TEAM
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, RotateCcw } from 'lucide-react';
import type { DojoSummary } from '@/teams/shared/contracts/dojo-source';
import { useDojoSource } from '@/teams/frontend/lib/dojo-source/DojoSourceProvider';
import { readDojoProgress, resumePath } from './useDojoProgress';
import flow from './DojoFlow.module.css';
import styles from './DojoList.module.css';

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; dojos: DojoSummary[] }
  | { status: 'error'; message: string };

function progressLine(dojo: DojoSummary): string {
  if (dojo.status === 'generating') return `Building your lessons · ${Math.round(dojo.progress)}%`;
  if (dojo.status === 'failed') return 'Generation failed';
  const progress = readDojoProgress(dojo.id, dojo.floorIds.length);
  const floors = dojo.floorIds.length;
  if (progress.stage === 'complete') return `Mastered · ${floors} floors`;
  if (progress.stage === 'boss') return 'Final Boss is waiting';
  const step = progress.stage === 'battle' ? 'battle' : 'lesson';
  return `Floor ${progress.currentFloor} of ${floors} · ${step}`;
}

function continueHref(dojo: DojoSummary): string {
  if (dojo.status !== 'ready') return `/dojo/${encodeURIComponent(dojo.id)}`;
  return resumePath(dojo.id, dojo.floorIds, readDojoProgress(dojo.id, dojo.floorIds.length));
}

export function DojoList() {
  const source = useDojoSource();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    source.listDojos().then(
      (dojos) => {
        if (!cancelled) setState({ status: 'ready', dojos });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Your dojos could not be loaded.',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source, attempt]);

  // Progress lives in this browser, so lines are read after mount (never during server render).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section className={flow.page} aria-busy={state.status === 'loading'}>
      <header className={flow.intro}>
        <div>
          <h1>Your dojos</h1>
          <p>Pick up exactly where you stopped, or start a new topic.</p>
        </div>
      </header>

      {state.status === 'error' && (
        <div className={styles.notice} role="alert">
          <p>Your dojos could not be loaded: {state.message}</p>
          <button
            className={flow.secondaryAction}
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((value) => value + 1);
            }}
            type="button"
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <ul className={styles.list}>
          {state.dojos.map((dojo) => (
            <li className={styles.row} key={dojo.id}>
              <div>
                <h2>{dojo.title}</h2>
                <p className={dojo.status === 'failed' ? styles.failed : styles.status}>
                  {mounted ? progressLine(dojo) : ' '}
                </p>
              </div>
              <Link
                className={flow.primaryAction}
                href={mounted ? continueHref(dojo) : `/dojo/${encodeURIComponent(dojo.id)}`}
              >
                {dojo.status === 'ready' ? 'Continue' : 'Open'} <ArrowRight size={15} />
              </Link>
              {dojo.status === 'generating' && (
                <div
                  className={flow.progressTrack}
                  role="progressbar"
                  aria-label={`${dojo.title} generation`}
                  aria-valuenow={Math.round(dojo.progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: `${Math.round(dojo.progress)}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.newTopic}>
        <p>Want to learn something else? Type any topic and it becomes a new tower.</p>
        <Link className={flow.secondaryAction} href="/">
          <Plus size={15} /> New topic
        </Link>
      </div>
    </section>
  );
}
