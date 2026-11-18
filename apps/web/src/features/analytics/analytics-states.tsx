import Link from "next/link";

export function AnalyticsUnavailable() {
  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-8" role="alert">
      <h2 className="text-lg font-semibold text-rose-950">Analytics are unavailable</h2>
      <p className="mt-2 max-w-xl text-sm text-rose-800">
        The assessment service could not load this cohort. Try again shortly.
      </p>
    </section>
  );
}

export function NoAnalyticsCohort() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">No students in this cohort</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
        No enrolled students are visible for this academic year and role.
      </p>
      <Link href="/" className="mt-5 inline-flex rounded-md bg-[#600bea] px-4 py-2 text-sm font-semibold text-white">
        Open student directory
      </Link>
    </section>
  );
}

export function AnalyticsLoading({ label }: { label: string }) {
  return (
    <div className="relative flex w-full min-w-0 flex-col px-4 py-6 sm:px-6" role="status" aria-label={label}>
      <div className="mb-8 space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[200px] animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function InvalidAnalyticsYear({ href }: { href: string }) {
  return (
    <section role="alert" className="overlayCard px-5 py-8">
      <h1 className="text-lg font-semibold text-gray-900">Academic year unavailable</h1>
      <p className="mt-2 text-sm text-gray-600">Choose an academic year that is visible to your role.</p>
      <Link href={href} className="mt-4 inline-flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50">
        Open latest year
      </Link>
    </section>
  );
}

export function InvalidRankings() {
  return (
    <section role="alert" className="overlayCard px-5 py-8">
      <h1 className="text-lg font-semibold text-gray-900">Ranking filters are invalid</h1>
      <p className="mt-2 text-sm text-gray-600">Choose a supported academic year, measure and page.</p>
      <Link href="/rankings" className="mt-4 inline-flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50">
        Reset rankings
      </Link>
    </section>
  );
}

export function ForbiddenRankings() {
  return (
    <section role="alert" className="overlayCard px-5 py-8">
      <h1 className="text-lg font-semibold text-gray-900">Year group unavailable</h1>
      <p className="mt-2 text-sm text-gray-600">Your current school role does not include this year group.</p>
      <Link href="/rankings" className="mt-4 inline-flex rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 shadow-sm hover:bg-gray-50">
        Open visible rankings
      </Link>
    </section>
  );
}
