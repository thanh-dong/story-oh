import { ExploreClient } from "./explore-client";

export default function ExplorePage() {
  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              The Library
            </span>
          </div>

          <div className="grid items-end gap-6 lg:grid-cols-[1.4fr_1fr]">
            <h1
              className="display m-0 text-5xl font-black leading-[0.98] sm:text-[72px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Explore <em className="font-medium italic text-primary">stories</em>.
            </h1>
            <p className="m-0 max-w-[360px] text-[15px] leading-relaxed text-muted-foreground">
              Adventures waiting to be discovered. Every story has multiple paths and
              endings — filter by age, theme, or length.
            </p>
          </div>

          <ExploreClient />
        </div>
      </div>
    </div>
  );
}
