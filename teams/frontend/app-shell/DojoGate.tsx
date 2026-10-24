'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Dojo } from '@/teams/shared/contracts/dojo';
import { DEMO_DOJO_ID } from '@/teams/frontend/lib/dojo-source/demo-source';
import { useDojo } from '@/teams/frontend/lib/dojo-source/DojoSourceProvider';
import styles from '@/teams/frontend/features/dojo-map/DojoFlow.module.css';

/**
 * Loads the dojo named in the route (or the demo on `/dojo`) through the active DojoSource,
 * then renders the screen with it. Screens never import dojo data directly.
 */
export function DojoGate({ children }: { children: (dojo: Dojo, dojoId: string) => ReactNode }) {
  const params = useParams<{ dojoId?: string }>();
  const dojoId = params.dojoId ?? DEMO_DOJO_ID;
  const state = useDojo(dojoId);

  if (state.status === 'loading') return null;

  if (state.status === 'missing') {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>UNKNOWN DOJO</p>
        <h1>This dojo does not exist.</h1>
        <Link className={styles.secondaryAction} href="/dojo">
          Open the demo tower
        </Link>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className={styles.gate}>
        <p className={styles.eyebrow}>CONNECTION LOST</p>
        <h1>The dojo could not be loaded.</h1>
        <p>{state.error.message}</p>
        <button className={styles.primaryAction} onClick={state.retry} type="button">
          Try again
        </button>
      </section>
    );
  }

  return <>{children(state.dojo, dojoId)}</>;
}
