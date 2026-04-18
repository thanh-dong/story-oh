import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories, vocabularyPlans, vocabularyProgress } from "@/lib/db/schema";
import { and, eq, or, isNull, inArray } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { Button } from "@/components/ui/button";
import { BookCover, CornerFold, Pill, ShelfLabel, Ornament } from "@/components/editorial";
import type { Story, StoryTree } from "@/lib/types";
import { Pencil, Play } from "lucide-react";

const coverPalettes: [string, string][] = [
  ["#D98A5B", "#8E3A2B"], ["#6E5FA8", "#3C2F6A"], ["#4D8F78", "#1F4F3F"],
  ["#C88A3F", "#7A3E1F"], ["#4D728F", "#1F3B52"], ["#8A5893", "#432948"],
];
function getPalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return coverPalettes[Math.abs(hash) % coverPalettes.length];
}

function isAtEnding(storyTree: StoryTree, currentNode: string): boolean {
  const node = storyTree[currentNode];
  return node ? node.choices.length === 0 : false;
}

export default async function ChildManagePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const age = calculateAge(child.dateOfBirth);

  const assignedRows = await db
    .select({ storyId: childStories.storyId })
    .from(childStories)
    .where(eq(childStories.childId, childId));
  const assignedIds = assignedRows.map((r) => r.storyId);

  const conditions = [
    isNull(stories.created_by),
    eq(stories.created_by, session.user.id),
  ];
  if (assignedIds.length > 0) {
    conditions.push(inArray(stories.id, assignedIds));
  }

  const storyList = await db.select().from(stories).where(or(...conditions));

  const progressRows = await db
    .select()
    .from(userStories)
    .where(and(eq(userStories.user_id, session.user.id), eq(userStories.child_id, childId)));
  const progressMap = new Map(progressRows.map((r) => [r.story_id, r.progress]));

  const assignedStories = storyList.map((story) => ({
    story: story as Story,
    progress: progressMap.get(story.id) ?? null,
  }));

  const completedCount = assignedStories.filter(
    (s) => s.progress && isAtEnding(s.story.story_tree, s.progress.current_node)
  ).length;
  const inProgressCount = assignedStories.filter(
    (s) => s.progress && !isAtEnding(s.story.story_tree, s.progress.current_node)
  ).length;

  // Kid-color based on name
  const colors = [
    "oklch(0.87 0.16 85 / 0.4)", "oklch(0.70 0.16 155 / 0.4)",
    "oklch(0.65 0.18 290 / 0.4)", "oklch(0.68 0.19 350 / 0.4)",
  ];
  let hash = 0;
  for (let i = 0; i < child.name.length; i++) hash = child.name.charCodeAt(i) + ((hash << 5) - hash);
  const avatarColor = colors[Math.abs(hash) % colors.length];

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            &larr; Back to dashboard
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div
                className="grid size-[72px] place-items-center rounded-2xl text-[36px]"
                style={{ background: avatarColor, boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.15)" }}
              >
                {child.avatar}
              </div>
              <div>
                <h1 className="display text-3xl font-black sm:text-[44px]" style={{ letterSpacing: "-0.02em" }}>
                  {child.name}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Pill tone="primary">Age {age}</Pill>
                  <Pill tone="muted">{child.nativeLanguage.toUpperCase()}</Pill>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" render={<Link href={`/dashboard/${childId}/edit`} />}>
                <Pencil className="size-3.5" data-icon="inline-start" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reader Mode CTA */}
      <div className="px-4 pt-6 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="relative overflow-hidden rounded-[18px] p-6 text-white sm:p-8" style={{ background: "oklch(0.22 0.03 55)" }}>
            <div className="pointer-events-none absolute inset-4 rounded-[14px] border border-white/10" />
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em] text-kid-yellow">
                  Reader Mode
                </span>
                <h2 className="display mt-1 text-xl font-black sm:text-2xl">
                  Hand the device to {child.name}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Simplified UI, no navigation distractions
                </p>
              </div>
              <Link href={`/dashboard/${childId}/read`}>
                <Button size="lg" className="rounded-full bg-white px-8 text-base font-bold text-foreground hover:bg-white/90">
                  <Play className="size-4" data-icon="inline-start" />
                  Start Reading
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="px-4 pt-6 sm:px-10">
        <div className="mx-auto grid max-w-[1360px] grid-cols-3 gap-4">
          {[
            { label: "Assigned", value: String(assignedStories.length), color: "var(--kid-purple)" },
            { label: "In Progress", value: String(inProgressCount), color: "var(--kid-orange)" },
            { label: "Completed", value: String(completedCount), color: "var(--kid-green)" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[14px] border border-border bg-parchment p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {stat.label}
              </div>
              <div className="display mt-1 text-[28px] font-black leading-none" style={{ color: stat.color, letterSpacing: "-0.03em" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Stories */}
      <div className="px-4 pb-16 pt-8 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <ShelfLabel roman="I" title="Stories" sub={`${assignedStories.length} assigned to ${child.name}`} />

          {assignedStories.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
              <p className="text-lg font-bold">No stories assigned yet</p>
              <p className="text-sm text-muted-foreground">
                Go to Explore to find stories and share them with {child.name}
              </p>
              <Link href="/explore">
                <Button className="rounded-full px-6 font-bold">Explore Stories</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {assignedStories.map(({ story, progress }) => {
                const isCompleted = progress && isAtEnding(story.story_tree, progress.current_node);
                const isInProgress = progress && !isCompleted;
                const palette = getPalette(story.title);

                return (
                  <article key={story.id} className="relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card">
                    <CornerFold />
                    <Link href={`/dashboard/${childId}/read/${story.id}`} className="block">
                      {story.cover_image ? (
                        <div className="relative h-[180px] w-full overflow-hidden">
                          <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                        </div>
                      ) : (
                        <BookCover title={story.title} palette={palette} tag={`Ages ${story.age_range}`} />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2">
                        {isCompleted && <Pill tone="green">&#x2713; Done</Pill>}
                        {isInProgress && <Pill tone="primary">{progress!.history.length - 1} choices</Pill>}
                        {!progress && <Pill tone="muted">Not started</Pill>}
                      </div>
                      <h3 className="display text-lg font-extrabold" style={{ letterSpacing: "-0.02em" }}>
                        {story.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{story.summary}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
