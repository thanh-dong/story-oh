import { db } from "@/lib/db";
import { stories as storiesTable, children as childrenTable, childStories } from "@/lib/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { StoryCard } from "@/components/story-card";
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

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Explore Stories
        </h1>
        <p className="mt-2 text-muted-foreground">
          {storyList.length} {storyList.length === 1 ? "adventure" : "adventures"} waiting for you
        </p>
      </div>

      {storyList.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {storyList.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              childrenList={userChildren}
              assignedChildIds={assignmentMap[story.id] ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-lg font-semibold">No stories yet</p>
          <p className="text-muted-foreground">
            New adventures are being written. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
