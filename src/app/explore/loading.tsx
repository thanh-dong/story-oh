export default function ExploreLoading() {
  return (
    <div className="animate-pulse bg-background px-4 pt-10 pb-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-5 h-3 w-36 rounded bg-muted" />
        <div className="mb-3 h-14 w-[40%] rounded-lg bg-muted" />
        {/* Filter row */}
        <div className="mt-8 flex gap-2 border-y border-border py-3.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-muted" />
          ))}
        </div>
        {/* Cards grid */}
        <div className="mt-10 grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-[18px] border border-border bg-card">
              <div className="h-[240px] bg-muted" />
              <div className="p-5">
                <div className="mb-2 h-4 w-20 rounded bg-muted" />
                <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
