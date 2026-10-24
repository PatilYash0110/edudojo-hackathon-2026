'use client';

/**
 * Home page side column: the lessons this learner has started, each one click from where they
 * stopped. Replaces the placeholder belt ladder.
 *
 * OWNER: FRONTEND TEAM
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DojoSummary } from '@/teams/shared/contracts/dojo-source';
import { useDojoSource } from '@/teams/frontend/lib/dojo-source/DojoSourceProvider';
import { DEMO_DOJO_ID } from '@/teams/frontend/lib/dojo-source/demo-source';
import { continueHref, progressLine } from './DojoList';
import { readDojoProgress } from './useDojoProgress';

const noSubscription = () => () => {};

/** The demo tower only counts as a lesson once the learner has moved past its first step. */
function started(dojo: DojoSummary): boolean {
  if (dojo.id !== DEMO_DOJO_ID) return true;
  const progress = readDojoProgress(dojo.id, dojo.floorIds.length);
  return progress.currentFloor > 1 || progress.stage !== 'lesson';
}

export function LessonsPanel() {
  const source = useDojoSource();
  const [dojos, setDojos] = useState<DojoSummary[] | null>(null);
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  useEffect(() => {
    let cancelled = false;
    source.listDojos().then(
      (list) => {
        if (!cancelled) setDojos(list);
      },
      () => {
        if (!cancelled) setDojos([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source]);

  const lessons = mounted && dojos ? dojos.filter(started) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-3">
        <h2 className="font-serif text-xl font-bold leading-tight text-foreground">Your lessons</h2>
        <p className="mt-1 text-xs text-muted-foreground">Continue where you stopped.</p>
        <div className="dojo-rule mt-3 w-full" aria-hidden />
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4" aria-busy={!lessons}>
        {lessons?.map((dojo) => (
          <li key={dojo.id}>
            <Link
              href={continueHref(dojo)}
              className="group flex w-full items-center gap-2 rounded-sm border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-sm font-semibold leading-tight text-foreground">
                  {dojo.title}
                </span>
                <span
                  className={
                    dojo.status === 'failed'
                      ? 'block truncate text-xs text-destructive'
                      : 'block truncate text-xs tabular-nums text-muted-foreground'
                  }
                >
                  {progressLine(dojo)}
                </span>
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          </li>
        ))}
        {lessons?.length === 0 && (
          <li className="px-2.5 py-2 text-sm text-muted-foreground">
            No lessons yet. Type a topic to build your first dojo.
          </li>
        )}
      </ol>

      <div className="border-t border-border px-4 py-3">
        <Link
          href="/dojo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          All your dojos <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
