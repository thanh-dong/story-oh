export default function DashboardLoading() {
  return (
    <div className="animate-pulse bg-background px-4 pt-10 pb-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-5 h-3 w-48 rounded bg-muted" />
        <div className="mb-3 h-12 w-[50%] rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />

        {/* Stats strip */}
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[14px] border border-border bg-parchment p-5">
              <div className="mb-2 h-3 w-24 rounded bg-muted" />
              <div className="h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Children */}
        <div className="mt-10">
          <div className="mb-5 h-6 w-32 rounded bg-muted" />
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-[18px] border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3.5">
                  <div className="size-[60px] rounded-2xl bg-muted" />
                  <div>
                    <div className="mb-2 h-5 w-24 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="rounded-xl border border-border bg-parchment px-3 py-2.5">
                      <div className="mb-1 h-5 w-8 rounded bg-muted" />
                      <div className="h-3 w-12 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
