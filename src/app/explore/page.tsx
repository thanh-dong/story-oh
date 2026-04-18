import { db } from "@/lib/db";
import { stories as storiesTable, children as childrenTable, childStories } from "@/lib/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ExploreClient } from "./explore-client";
import type { Child } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  const totalCount = storyList.length;

  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
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
              Explore <em className="font-medium italic text-primary">stories</em>.
            </h1>
            <p className="m-0 max-w-[360px] text-[15px] leading-relaxed text-muted-foreground">
              {totalCount} adventures waiting to be discovered. Every story has multiple paths and
              endings — filter by age, theme, or length.
            </p>
          </div>

          <ExploreClient
            stories={storyList.map((s) => ({
              id: s.id,
              title: s.title,
              summary: s.summary,
              age_range: s.age_range,
              cover_image: s.cover_image,
              story_tree: s.story_tree,
              created_at: s.created_at ?? "",
            }))}
            userChildren={userChildren}
            assignmentMap={assignmentMap}
          />
        </div>
      </div>
    </div>
  );
}
