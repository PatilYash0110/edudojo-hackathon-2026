'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { DEMO_DOJO_ID } from '@/teams/frontend/lib/dojo-source/demo-source';
import { useDojo } from '@/teams/frontend/lib/dojo-source/DojoSourceProvider';
import styles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';

/** Holds the page's height while a dojo screen loads; the line only shows if loading is slow. */
export function DojoLoading() {
  return (
    <section className={styles.loading} aria-busy="true">
      <p role="status">Opening the dojo…</p>
    </section>
  );
}

/**
 * Loads the dojo named in the route (the demo when none is named) through the active DojoSource,
 * then renders the screen with it. Screens never import dojo data directly.
 */
export function DojoGate({ children }: { children: (dojo: Dojo, dojoId: string) => ReactNode }) {
  const params = useParams<{ dojoId?: string }>();
  const dojoId = params.dojoId ?? DEMO_DOJO_ID;
  const state = useDojo(dojoId);

  if (state.status === 'loading') return <DojoLoading />;

  if (state.status === 'missing') {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>UNKNOWN DOJO</p>
        <h1>This dojo does not exist.</h1>
        <div className={styles.lessonActions}>
          <Link className={styles.primaryAction} href="/">
            Enter a new topic
          </Link>
          <Link className={styles.secondaryAction} href={`/dojo/${DEMO_DOJO_ID}`}>
            Open the demo tower
          </Link>
        </div>
      </section>
    );
  }

  if (state.status === 'generating') {
    const progress = Math.round(Math.min(100, Math.max(0, state.progress)));
    return (
      <section className={styles.gate} aria-busy="true">
        <p className={styles.eyebrow}>BUILDING YOUR DOJO · {progress}%</p>
        <h1>The Sensei is preparing your lessons.</h1>
        <p>
          Your topic becomes slides, narration, and one tower floor per section. This takes a few
          minutes; the tower opens on its own when it is ready.
        </p>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Dojo generation"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${progress}%` }} />
        </div>
        <Link className={styles.secondaryAction} href={`/dojo/${DEMO_DOJO_ID}`}>
          Train in the demo tower meanwhile
        </Link>
      </section>
    );
  }

  if (state.status === 'failed' || state.status === 'error') {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>
          {state.status === 'failed' ? 'GENERATION FAILED' : 'CONNECTION LOST'}
        </p>
        <h1>The dojo could not be loaded.</h1>
        <p>{state.status === 'failed' ? state.error : state.error.message}</p>
        <div className={styles.lessonActions}>
          <button className={styles.primaryAction} onClick={state.retry} type="button">
            Try again
          </button>
          <Link className={styles.secondaryAction} href="/">
            Enter a new topic
          </Link>
          <Link className={styles.secondaryAction} href={`/dojo/${DEMO_DOJO_ID}`}>
            Play the demo tower
          </Link>
        </div>
      </section>
    );
  }

  return <>{children(state.dojo, dojoId)}</>;
}
