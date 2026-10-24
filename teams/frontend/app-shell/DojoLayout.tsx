/**
 * FRONTEND TEAM. Layout for every DojoLearn page.
 * TODO: header, role + language switch, responsive frame.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import '@/teams/frontend/theme/dojo.css';

const NAV = [
  ['/dojo', 'Dojos'],
  ['/dojo/demo', 'Map'],
  ['/dojo/demo/floor/1', 'Floor'],
  ['/dojo/demo/floor/1/battle', 'Battle'],
  ['/dojo/demo/boss', 'Boss'],
  ['/dojo/demo/leaderboard', 'Leaderboard'],
  ['/dashboard', 'Student dashboard'],
  ['/teacher', 'Teacher'],
  ['/teacher/dojo/new', 'Create dojo'],
];

export default function DojoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dojo-root min-h-screen">
      <nav className="flex flex-wrap gap-3 border-b p-3 text-sm">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
