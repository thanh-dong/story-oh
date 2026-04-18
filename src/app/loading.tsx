export default function Loading() {
  return (
    <div className="animate-pulse bg-background px-4 pt-16 pb-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-5 h-3 w-40 rounded bg-muted" />
        <div className="mb-4 h-12 w-[60%] rounded-lg bg-muted" />
        <div className="h-5 w-80 rounded bg-muted" />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[18px] border border-border bg-card p-6">
              <div className="mb-4 h-[180px] rounded-[14px] bg-muted" />
              <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
