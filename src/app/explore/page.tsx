import Link from "next/link";
import { db } from "@/lib/db";
import { stories as storiesTable, children as childrenTable, childStories } from "@/lib/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { BookCover, Pill, ShelfLabel } from "@/components/editorial";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import type { Child, StoryTree } from "@/lib/types";

export const dynamic = "force-dynamic";

const coverPalettes: [string, string][] = [
  ["#D98A5B", "#8E3A2B"],
  ["#6E5FA8", "#3C2F6A"],
  ["#4D8F78", "#1F4F3F"],
  ["#C88A3F", "#7A3E1F"],
  ["#4D728F", "#1F3B52"],
  ["#8A5893", "#432948"],
];

function getPalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return coverPalettes[Math.abs(hash) % coverPalettes.length];
}

const lessonKeywords = ["Courage", "Patience", "Kindness", "Wonder", "Honesty", "Curiosity", "Friendship", "Empathy"];
function getLesson(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return lessonKeywords[Math.abs(hash) % lessonKeywords.length];
}

export default async function ExplorePage() {
  const storyList = await db.select().from(storiesTable).where(isNull(storiesTable.created_by));

  const session = await getSession();
  let userChildren: Child[] = [];
  const assignmentMap: Record<string, string[]> = {};

  if (session) {
    userChildren = (await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.parentId, session.user.id))) as Child[];

    if (userChildren.length > 0) {
      const childIds = userChildren.map((c) => c.id);
      const assignments = await db
        .select()
        .from(childStories)
        .where(inArray(childStories.childId, childIds));

      for (const a of assignments) {
        if (!assignmentMap[a.storyId]) assignmentMap[a.storyId] = [];
        assignmentMap[a.storyId].push(a.childId);
      }
    }
  }

  const youngStories = storyList.filter((s) => s.age_range === "4-8");
  const olderStories = storyList.filter((s) => s.age_range === "8-12");
  const otherStories = storyList.filter((s) => s.age_range !== "4-8" && s.age_range !== "8-12");

  const totalCount = storyList.length;

  return (
    <div className="bg-background text-foreground">
      {/* ─── HERO ─── */}
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              The Library &middot; {totalCount} volumes
            </span>
          </div>

          <div className="grid items-end gap-6 lg:grid-cols-[1.4fr_1fr]">
            <h1
              className="display m-0 text-5xl font-black leading-[0.98] sm:text-[72px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Explore <em className="font-medium text-primary" style={{ fontStyle: "italic" }}>stories</em>.
            </h1>
            <p className="m-0 max-w-[360px] text-[15px] leading-relaxed text-muted-foreground">
              {totalCount} adventures waiting to be discovered. Every story has multiple paths and
              endings — filter by age, theme, or length.
            </p>
          </div>

          {/* Filter row */}
          <div className="mt-8 flex items-center justify-between border-y border-border py-3.5">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", count: totalCount, active: true },
                { label: "Ages 4\u20138", count: youngStories.length, active: false },
                { label: "Ages 8\u201312", count: olderStories.length, active: false },
              ].map((f) => (
                <div
                  key={f.label}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
                    f.active
                      ? "border-ink bg-ink text-background"
                      : "border-border bg-transparent text-foreground"
                  }`}
                >
                  {f.label}
                  <span className="text-[11px] opacity-60">{f.count}</span>
                </div>
              ))}
            </div>
            <div className="hidden items-center gap-3.5 text-xs text-muted-foreground sm:flex">
              <span>Sort:</span>
              <span className="font-semibold text-ink">Newest &darr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Age 4–8 shelf ─── */}
      {youngStories.length > 0 && (
        <div className="px-4 pb-7 pt-8 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <ShelfLabel roman="I" title="Ages 4\u20148" sub="Simple stories with gentle lessons" />
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {youngStories.map((story) => (
                <StoryCardLg
                  key={story.id}
                  story={story}
                  childrenList={userChildren}
                  assignedChildIds={assignmentMap[story.id] ?? []}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Age 8–12 shelf ─── */}
      {olderStories.length > 0 && (
        <div className="px-4 pb-16 pt-2 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <ShelfLabel roman="II" title="Ages 8\u201412" sub="Richer stories with deeper choices" />
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {olderStories.map((story) => (
                <StoryCardLg
                  key={story.id}
                  story={story}
                  childrenList={userChildren}
                  assignedChildIds={assignmentMap[story.id] ?? []}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Other stories ─── */}
      {otherStories.length > 0 && (
        <div className="px-4 pb-16 pt-2 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <ShelfLabel roman="III" title="More Stories" sub="Additional adventures" />
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {otherStories.map((story) => (
                <StoryCardLg
                  key={story.id}
                  story={story}
                  childrenList={userChildren}
                  assignedChildIds={assignmentMap[story.id] ?? []}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {storyList.length === 0 && (
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-parchment py-24 text-center mx-4 sm:mx-10 mb-16">
          <p className="text-xl font-bold">No stories yet</p>
          <p className="text-muted-foreground">
            New adventures are being written. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}

function StoryCardLg({
  story,
  childrenList,
  assignedChildIds,
}: {
  story: { id: string; title: string; summary: string; age_range: string; story_tree: unknown };
  childrenList: Child[];
  assignedChildIds: string[];
}) {
  const palette = getPalette(story.title);
  const tree = story.story_tree as StoryTree;
  const nodeCount = Object.keys(tree).length;
  const endingCount = Object.values(tree).filter((n) => n.choices.length === 0).length;
  const lesson = getLesson(story.title);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card">
      {childrenList.length > 0 && (
        <div className="absolute left-3 top-3 z-10">
          <ShareStoryDialog
            storyId={story.id}
            childrenList={childrenList}
            assignedChildIds={assignedChildIds}
          />
        </div>
      )}
      <Link href={`/story/${story.id}`} className="block">
        <BookCover title={story.title} palette={palette} tall tag={`Ages ${story.age_range}`} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex gap-1.5">
          <Pill tone="purple">{lesson}</Pill>
        </div>
        <Link href={`/story/${story.id}`}>
          <h3 className="display text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
            {story.title}
          </h3>
        </Link>
        <p className="mt-1.5 mb-3 flex-1 text-sm leading-normal text-muted-foreground line-clamp-2">
          {story.summary}
        </p>
        <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
          <div className="flex gap-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            <span>{nodeCount}p</span>
            <span className="opacity-40">&middot;</span>
            <span>{endingCount} endings</span>
          </div>
          <Link href={`/story/${story.id}`} className="text-[13px] font-bold text-primary">
            Open &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
