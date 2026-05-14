import Link from "next/link";
import { Ornament } from "@/components/editorial";
import { getSession } from "@/lib/auth";
import { DoneTelemetry } from "./done-telemetry";

// Heuristic: if the signed-in user's row was created within this many seconds
// of "now", treat this as a fresh signup from the /v1 funnel. Otherwise treat
// it as an existing user who just saved one more story.
const FRESH_SIGNUP_WINDOW_MS = 90 * 1000;

export default async function DonePage({
  searchParams,
}: {
  searchParams: Promise<{ storyId?: string }>;
}) {
  const { storyId } = await searchParams;
  const session = await getSession();

  const isFreshSignup = (() => {
    if (!session?.user?.createdAt) return false;
    const createdAt = new Date(session.user.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt < FRESH_SIGNUP_WINDOW_MS;
  })();

  const storyHref = storyId ? `/story/${storyId}/read` : "/dashboard";
  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  const copy = isFreshSignup
    ? {
        eyebrow: "All done",
        headline: <>Your account is <em className="font-medium italic text-primary">ready!</em></>,
        body: "You're signed in and your story is saved. Read it now, or head to the dashboard to make more.",
        primaryLabel: "Go to dashboard",
        primaryHref: "/dashboard",
        secondaryLabel: "Read my story now",
        secondaryHref: storyHref,
      }
    : {
        eyebrow: "Story saved",
        headline: (
          <>
            {firstName ? <>Nice one, {firstName} — </> : null}
            another{" "}
            <em className="font-medium italic text-primary">story</em>{" "}
            in the library.
          </>
        ),
        body: "Saved to your library. Read it now, or start a new one.",
        primaryLabel: "Read my story now",
        primaryHref: storyHref,
        secondaryLabel: "Make another",
        secondaryHref: "/v1",
      };

  return (
    <div className="bg-background text-foreground">
      <DoneTelemetry storyId={storyId} />
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16 text-center sm:px-10">
        <div className="mx-auto max-w-md space-y-6">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="h-px w-8 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              {copy.eyebrow}
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
            {copy.headline}
          </h1>

          <p className="text-[17px] leading-relaxed text-muted-foreground">
            {copy.body}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={copy.primaryHref}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold text-white"
            >
              {copy.primaryLabel}
            </Link>
            <Link
              href={copy.secondaryHref}
              className="inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-4 text-base font-bold text-ink"
            >
              {copy.secondaryLabel}
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
