import Link from "next/link";
import { Ornament } from "@/components/editorial";
import { DoneTelemetry } from "./done-telemetry";

export default async function DonePage({
  searchParams,
}: {
  searchParams: Promise<{ storyId?: string }>;
}) {
  const { storyId } = await searchParams;
  const storyHref = storyId ? `/story/${storyId}/read` : "/dashboard";

  return (
    <div className="bg-background text-foreground">
      <DoneTelemetry storyId={storyId} />
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16 text-center sm:px-10">
        <div className="mx-auto max-w-md space-y-6">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="h-px w-8 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              All done
            </span>
            <div className="h-px w-8 bg-ink" />
          </div>

          {/* Check mark */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="display text-3xl font-black text-primary">&#x2713;</span>
          </div>

          <h1
            className="display text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Your account is{" "}
            <em className="font-medium italic text-primary">ready!</em>
          </h1>

          <p className="text-[17px] leading-relaxed text-muted-foreground">
            You&rsquo;re signed in and your story is saved. Read it now, or
            head to the dashboard to make more.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold text-white"
            >
              Go to dashboard
            </Link>
            <Link
              href={storyHref}
              className="inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-4 text-base font-bold text-ink"
            >
              Read my story now
            </Link>
          </div>

          {/* Ornaments */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Ornament kind="diamond" size={10} color="var(--kid-orange)" />
            <Ornament kind="star" size={12} color="var(--kid-yellow)" />
            <Ornament kind="diamond" size={10} color="var(--kid-pink)" />
          </div>
        </div>
      </div>
    </div>
  );
}
