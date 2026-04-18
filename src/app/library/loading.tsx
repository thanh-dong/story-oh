export default function LibraryLoading() {
  return (
    <div className="animate-pulse bg-background px-4 pt-10 pb-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-5 h-3 w-28 rounded bg-muted" />
        <div className="mb-8 h-12 w-[40%] rounded-lg bg-muted" />
        <div className="mb-5 h-6 w-32 rounded bg-muted" />
        <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-[18px] border border-border bg-card">
              <div className="h-[180px] bg-muted" />
              <div className="p-5">
                <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
