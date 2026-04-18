import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <div className="bg-background">
      {/* Static header shell — renders instantly from CDN */}
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Chapter III &middot; The Family
            </span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1
                className="display m-0 text-4xl font-black leading-[0.98] sm:text-[64px]"
                style={{ letterSpacing: "-0.03em" }}
              >
                Your{" "}
                <em className="font-medium italic text-primary">
                  family
                </em>{" "}
                bookshelf.
              </h1>
              <p className="mt-3.5 text-[15px] text-muted-foreground">
                Manage children&rsquo;s plans, track progress, and assign new stories.
              </p>
            </div>
            <Link href="/dashboard/new">
              <Button size="lg" className="rounded-full bg-primary px-6 text-base font-bold text-white">
                + Add child
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic data — fetched client-side via SWR */}
      <DashboardClient />
    </div>
  );
}
