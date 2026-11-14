export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card min-h-[148px] animate-pulse p-[18px]">
          <div className="flex items-start justify-between">
            <div className="h-3 w-24 rounded bg-surface-muted" />
            <div className="h-4 w-16 rounded-full bg-surface-muted" />
          </div>
          <div className="mt-6 h-7 w-32 rounded bg-surface-muted" />
          <div className="mt-5 h-3 w-40 rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300, className = "" }: { height?: number; className?: string }) {
  return (
    <div className={`card animate-pulse overflow-hidden ${className}`}>
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <div className="h-4 w-40 rounded bg-surface-muted" />
          <div className="mt-2 h-2.5 w-28 rounded bg-surface-muted" />
        </div>
        <div className="h-5 w-20 rounded-full bg-surface-muted" />
      </div>
      <div className="px-5 pb-5 pt-6">
        <div className="w-full rounded-lg bg-surface-muted/70" style={{ height }} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card animate-pulse p-5">
      <div className="h-4 w-44 rounded bg-surface-muted" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-9 w-full rounded bg-surface-muted/70" />
        ))}
      </div>
    </div>
  );
}

export function InlineLoading({ label = "Loading data…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-subtle px-3 py-2 text-[12px] text-ink-muted">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {label}
    </div>
  );
}
