import { db } from "@/lib/db";
import { stories as storiesTable, children as childrenTable, childStories } from "@/lib/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { StoryCard } from "@/components/story-card";
import { Compass, BookOpen, Sparkles } from "lucide-react";
import type { Child } from "@/lib/types";

export default async function ExplorePage() {
  const storyList = await db.select().from(storiesTable).where(isNull(storiesTable.created_by));

  // Fetch user's children and assignments if logged in
  const session = await getSession();
  let userChildren: Child[] = [];
  let assignmentMap: Record<string, string[]> = {};

  if (session) {
    userChildren = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.parentId, session.user.id)) as Child[];

    if (userChildren.length > 0) {
      const childIds = userChildren.map((c) => c.id);
      const assignments = await db
        .select()
        .from(childStories)
        .where(inArray(childStories.childId, childIds));

      for (const a of assignments) {
        if (!assignmentMap[a.storyId]) {
          assignmentMap[a.storyId] = [];
        }
        assignmentMap[a.storyId].push(a.childId);
      }
    }
  }

  // Group stories by age range
  const youngStories = storyList.filter((s) => s.age_range === "4-8");
  const olderStories = storyList.filter((s) => s.age_range === "8-12");
  const otherStories = storyList.filter((s) => s.age_range !== "4-8" && s.age_range !== "8-12");

  return (
    <div className="space-y-16 pb-12">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-kid-purple/10 to-kid-pink/5 px-8 py-12 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-kid-yellow/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-kid-purple/10 blur-2xl" />
        </div>

        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute right-8 top-8 animate-float opacity-60">
            <Compass className="size-8 text-primary/30" />
          </div>
          <div className="absolute bottom-8 right-24 animate-float-reverse opacity-40" style={{ animationDelay: "1s" }}>
            <BookOpen className="size-6 text-kid-purple/30" />
          </div>
        </div>

        <div className="relative">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-card backdrop-blur-sm dark:bg-card/60">
            <Sparkles className="size-3.5" />
            Story Library
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Explore Stories
          </h1>
          <p className="mt-3 max-w-lg text-lg text-muted-foreground">
            {storyList.length} {storyList.length === 1 ? "adventure" : "adventures"} waiting to be discovered.
            Every story has multiple paths and endings.
          </p>

          {/* Stats pills */}
          <div className="mt-6 flex flex-wrap gap-3">
            {youngStories.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-kid-green/15 px-4 py-1.5 text-sm font-semibold text-kid-green">
                🌱 {youngStories.length} for ages 4-8
              </span>
            )}
            {olderStories.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-kid-purple/15 px-4 py-1.5 text-sm font-semibold text-kid-purple">
                🚀 {olderStories.length} for ages 8-12
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Age 4-8 section */}
      {youngStories.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-kid-green/15">
              <span className="text-lg">🌱</span>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Ages 4&#x2013;8</h2>
              <p className="text-sm text-muted-foreground">Simple stories with gentle lessons</p>
            </div>
          </div>
          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {youngStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                childrenList={userChildren}
                assignedChildIds={assignmentMap[story.id] ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {/* Age 8-12 section */}
      {olderStories.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-kid-purple/15">
              <span className="text-lg">🚀</span>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Ages 8&#x2013;12</h2>
              <p className="text-sm text-muted-foreground">Richer stories with deeper choices</p>
            </div>
          </div>
          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {olderStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                childrenList={userChildren}
                assignedChildIds={assignmentMap[story.id] ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other stories (if any) */}
      {otherStories.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold tracking-tight">More Stories</h2>
          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                childrenList={userChildren}
                assignedChildIds={assignmentMap[story.id] ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {storyList.length === 0 && (
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-kid-yellow/10 to-kid-orange/5 py-24 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-kid-yellow/20">
            <BookOpen className="size-10 text-kid-orange" />
          </div>
          <div>
            <p className="text-xl font-bold">No stories yet</p>
            <p className="mt-1 text-muted-foreground">
              New adventures are being written. Check back soon!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
