import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'New in' },
  { href: '/', label: 'Women' },
  { href: '/', label: 'Men' },
];

/** Public storefront shell (PLAN §6). Catalog navigation arrives in Phase 4. */
export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-semibold tracking-[0.2em] uppercase">
            Auren
          </Link>
          <nav aria-label="Main" className="flex gap-6 text-sm">
            {NAV.map((item) => (
              <Link key={item.label} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="text-muted-foreground border-t py-8 text-center text-sm">© Auren</footer>
    </div>
  );
}
