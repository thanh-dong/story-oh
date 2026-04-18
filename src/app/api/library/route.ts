import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories as storiesTable, userStories, children as childrenTable, childStories } from "@/lib/db/schema";
import { and, eq, isNull, inArray } from "drizzle-orm";
import type { Story } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Run independent queries in parallel
    const [myStories, readingRows, userChildren] = await Promise.all([
      db.select().from(storiesTable).where(eq(storiesTable.created_by, userId)),
      db
        .select()
        .from(userStories)
        .innerJoin(storiesTable, eq(userStories.story_id, storiesTable.id))
        .where(and(eq(userStories.user_id, userId), isNull(userStories.child_id))),
      db.select().from(childrenTable).where(eq(childrenTable.parentId, userId)),
    ]);

    // Build assignment map
    const assignmentMap: Record<string, string[]> = {};
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

    // Process reading list
    const readingList = readingRows.map((row) => {
      const story = row.stories as Story;
      const choicesMade = row.user_stories.progress?.history?.length ?? 0;
      const currentNode = story.story_tree?.[row.user_stories.progress?.current_node ?? "start"];
      const isAtEnding = !!(currentNode && currentNode.choices.length === 0);
      return {
        id: row.user_stories.id,
        storyId: story.id,
        title: story.title,
        summary: story.summary,
        coverImage: story.cover_image,
        ageRange: story.age_range,
        storyTree: story.story_tree,
        choicesMade,
        isAtEnding,
      };
    });

    const myStoriesData = myStories.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      coverImage: s.cover_image,
      ageRange: s.age_range,
      storyTree: s.story_tree,
    }));

    return NextResponse.json({
      myStories: myStoriesData,
      readingList,
      userChildren,
      assignmentMap,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
