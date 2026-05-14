import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { guestStoryDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readGuestId } from "@/lib/guest-id";
import { Ornament } from "@/components/editorial";
import { PreviewClient } from "./preview-client";
import { GeneratingPoller } from "./preview-client";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  const guestId = await readGuestId();
  if (!guestId) redirect("/v1");

  const [draft] = await db
    .select()
    .from(guestStoryDrafts)
    .where(eq(guestStoryDrafts.id, draftId));

  if (!draft) notFound();
  if (draft.guest_id !== guestId) redirect("/v1");

  const nowIso = new Date().toISOString();
  if (draft.expires_at < nowIso) {
    return (
      <ErrorView
        heading="Link expired"
        body="This preview link has expired. Start fresh to generate a new story."
      />
    );
  }

  if (draft.status === "failed") {
    return (
      <ErrorView
        heading="Generation failed"
        body="Something went wrong generating your story."
        cta={{ href: "/v1", label: "Try again" }}
      />
    );
  }

  if (draft.status === "generating" || !draft.story_json) {
    return (
      <div className="bg-background text-foreground">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <h2
            className="display text-2xl font-black sm:text-3xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            Crafting your story&hellip;
          </h2>
          <p className="mt-3 max-w-sm text-[15px] text-muted-foreground">
            This usually takes about 20–30 seconds. The page will refresh automatically.
          </p>
          <GeneratingPoller draftId={draftId} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Your story preview
            </span>
          </div>

          <h1
            className="display text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {draft.story_json.title}
          </h1>

          <p className="text-[15px] text-muted-foreground">
            {draft.story_json.summary}
          </p>

          <PreviewClient
            draftId={draftId}
            story={draft.story_json}
            storyTitle={draft.story_json.title}
            childName={
              (draft.config_json as { mainCharacterName?: string })?.mainCharacterName
            }
          />

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

function ErrorView({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="bg-background text-foreground">
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <h2
          className="display text-2xl font-black sm:text-3xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          {heading}
        </h2>
        <p className="mt-3 max-w-sm text-[15px] text-muted-foreground">{body}</p>
        {cta && (
          <Link
            href={cta.href}
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-base font-bold text-white"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
