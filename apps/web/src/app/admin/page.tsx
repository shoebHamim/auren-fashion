import { Suspense } from 'react';
import { serverApi } from '@/lib/api/server';

export default function AdminDashboardPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <section className="rounded-lg border p-5">
        <h2 className="mb-3 font-medium">System status</h2>
        <Suspense fallback={<p className="text-muted-foreground text-sm">Checking…</p>}>
          <SystemStatus />
        </Suspense>
      </section>
    </div>
  );
}

async function fetchReadiness() {
  try {
    const api = await serverApi();
    const response = await api.api.ready.$get();
    return await response.json();
  } catch {
    return null;
  }
}

/** Dynamic (uses request headers), so it streams in after the static shell. */
async function SystemStatus() {
  const readiness = await fetchReadiness();
  if (!readiness) return <p className="text-destructive text-sm">The API is unreachable.</p>;

  const { appliedMigrations, expectedMigrations } = readiness.checks.database;
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <dt className="text-muted-foreground">API</dt>
      <dd>{readiness.status === 'ready' ? 'Ready' : 'Not ready'}</dd>
      <dt className="text-muted-foreground">Database migrations</dt>
      <dd>
        {appliedMigrations} / {expectedMigrations}
      </dd>
    </dl>
  );
}
