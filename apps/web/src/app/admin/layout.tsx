import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Auren Admin' },
  robots: { index: false, follow: false },
};

const NAV = [
  'Dashboard',
  'Orders',
  'Products',
  'Inventory',
  'Customers',
  'Discounts',
  'Reports',
  'Settings',
];

/** Back-office shell (PLAN §6, D26). Staff authentication and permission-aware nav arrive in Phase 1. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="bg-muted/40 hidden w-60 shrink-0 border-r p-4 md:block">
        <Link href="/admin" className="mb-6 block text-lg font-semibold tracking-[0.2em] uppercase">
          Auren
        </Link>
        <nav aria-label="Admin" className="flex flex-col gap-1 text-sm">
          {NAV.map((label) => (
            <span
              key={label}
              className="text-muted-foreground rounded-md px-3 py-2 first:bg-background first:text-foreground"
            >
              {label}
            </span>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
