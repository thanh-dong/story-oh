import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LibraryClient } from "./library-client";

export default function LibraryPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Static header shell */}
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Your Collection
            </span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h1
              className="display m-0 text-4xl font-black leading-[0.98] sm:text-[64px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              My <em className="font-medium italic text-primary">Library</em>.
            </h1>
            <Link href="/library/stories/new">
              <Button size="lg" className="rounded-full bg-primary px-6 text-base font-bold text-white">
                + New Story
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic data via SWR */}
      <LibraryClient />
    </div>
  );
}
