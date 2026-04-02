import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userStories } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storyId } = await params;
  const body = await request.json();
  const progress = {
    current_node: body.current_node,
    history: body.history,
  };
  const childId: string | null = body.childId ?? null;

  const whereClause = childId
    ? and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId),
        eq(userStories.child_id, childId)
      )
    : and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId),
        isNull(userStories.child_id)
      );

  const [existing] = await db
    .select()
    .from(userStories)
    .where(whereClause);

  if (existing) {
    await db
      .update(userStories)
      .set({ progress })
      .where(eq(userStories.id, existing.id));
  } else {
    await db.insert(userStories).values({
      user_id: session.user.id,
      story_id: storyId,
      child_id: childId,
      progress,
    });
  }

  return NextResponse.json({ ok: true });
}
