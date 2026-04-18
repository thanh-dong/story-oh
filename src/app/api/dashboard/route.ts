import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children, childStories, stories, userStories } from "@/lib/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { calculateAge } from "@/lib/children";
import type { StoryTree } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const childrenList = await db
      .select()
      .from(children)
      .where(eq(children.parentId, userId));

    if (childrenList.length === 0) {
      return NextResponse.json({
        children: [],
        activity: [],
        stats: { totalDone: 0, totalReading: 0, totalChildren: 0 },
      });
    }

    const childIds = childrenList.map((c) => c.id);

    // Batch: assignment counts + all progress + recent activity — 3 queries
    const [assignmentCounts, allProgressRows, recentActivity] = await Promise.all([
      db
        .select({
          childId: childStories.childId,
          count: sql<string>`count(*)`,
        })
        .from(childStories)
        .where(inArray(childStories.childId, childIds))
        .groupBy(childStories.childId),

      db
        .select()
        .from(userStories)
        .innerJoin(stories, eq(userStories.story_id, stories.id))
        .where(
          and(
            eq(userStories.user_id, userId),
            inArray(userStories.child_id, childIds)
          )
        ),

      db
        .select()
        .from(userStories)
        .innerJoin(stories, eq(userStories.story_id, stories.id))
        .innerJoin(children, eq(userStories.child_id, children.id))
        .where(
          and(
            eq(userStories.user_id, userId),
            inArray(userStories.child_id, childIds)
          )
        )
        .orderBy(desc(userStories.created_at))
        .limit(4),
    ]);

    // Build lookup maps
    const assignmentMap = new Map(assignmentCounts.map((r) => [r.childId, Number(r.count)]));

    const progressMap = new Map<string, { completed: number; inProgress: number }>();
    for (const row of allProgressRows) {
      const cid = row.user_stories.child_id!;
      const entry = progressMap.get(cid) ?? { completed: 0, inProgress: 0 };
      const currentNode = row.user_stories.progress?.current_node ?? "start";
      const storyTree = row.stories.story_tree as StoryTree;
      const node = storyTree[currentNode];
      if (node && node.choices.length === 0) {
        entry.completed++;
      } else {
        entry.inProgress++;
      }
      progressMap.set(cid, entry);
    }

    const childrenWithStats = childrenList.map((child) => {
      const progress = progressMap.get(child.id) ?? { completed: 0, inProgress: 0 };
      return {
        id: child.id,
        name: child.name,
        avatar: child.avatar,
        age: calculateAge(child.dateOfBirth),
        assignedCount: assignmentMap.get(child.id) ?? 0,
        completedCount: progress.completed,
        inProgressCount: progress.inProgress,
      };
    });

    const activity = recentActivity.map((row) => {
      const currentNode = row.user_stories.progress?.current_node ?? "start";
      const tree = row.stories.story_tree as StoryTree;
      const node = tree[currentNode];
      const isCompleted = !!(node && node.choices.length === 0);

      return {
        id: row.user_stories.id,
        childName: row.children.name,
        storyTitle: row.stories.title,
        isCompleted,
        page: row.user_stories.progress?.history?.length ?? 1,
        createdAt: row.user_stories.created_at,
      };
    });

    const totalDone = childrenWithStats.reduce((s, c) => s + c.completedCount, 0);
    const totalReading = childrenWithStats.reduce((s, c) => s + c.inProgressCount, 0);

    return NextResponse.json({
      children: childrenWithStats,
      activity,
      stats: { totalDone, totalReading, totalChildren: childrenWithStats.length },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
