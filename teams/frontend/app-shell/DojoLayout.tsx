'use client';

/**
 * FRONTEND TEAM. Layout for every DojoLearn page.
 * Styled after the home page (app/page.tsx): logo + serif brand, paper texture,
 * translucent card bar, vermilion (shu) marks the active page.
 * TODO: role + language switch.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import '@/teams/frontend/theme/dojo.css';

/** Solo learner nav: their dojos, a new topic, and the open dojo's own pages. */
function navFor(pathname: string): [href: string, label: string][] {
  const items: [string, string][] = [
    ['/dojo', 'My dojos'],
    ['/', 'New topic'],
    ['/privacy', 'Privacy'],
  ];
  const dojoId = pathname.match(/^\/dojo\/([^/]+)/)?.[1];
  if (dojoId) {
    items.push([`/dojo/${dojoId}`, 'Tower'], [`/dojo/${dojoId}/leaderboard`, 'Leaderboard']);
  }
  return items;
}

export default function DojoLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const NAV = navFor(pathname);

  return (
    // `dark`: the whole game is the night dojo (the tower and arenas are painted at night), so
    // every dojo page stays on the dark tokens whatever the site theme is.
    <div className="dark dojo-root dojo-paper min-h-screen text-foreground">
      <nav
        aria-label="Dojo"
        className="sticky top-0 z-40 border-b border-border bg-card/90 shadow-sm backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="EduDojo home">
            <img src="/logo-horizontal.png" alt="" className="h-8 w-auto object-contain" />
            <span className="font-serif text-xl font-bold leading-none tracking-wide">EduDojo</span>
          </Link>
          {/* Phones: one scrollable row instead of wrapping, so the sticky bar stays short. */}
          <ul className="flex items-center gap-x-5 overflow-x-auto whitespace-nowrap text-sm max-md:w-full max-md:[scrollbar-width:none] md:flex-wrap md:gap-y-1">
            {NAV.map(([href, label]) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-block border-b-2 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      active
                        ? 'border-primary font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
