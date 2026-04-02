import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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

  const [existing] = await db
    .select()
    .from(userStories)
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId)
      )
    );

  if (existing) {
    await db
      .update(userStories)
      .set({ progress })
      .where(
        and(
          eq(userStories.user_id, session.user.id),
          eq(userStories.story_id, storyId)
        )
      );
  } else {
    await db.insert(userStories).values({
      user_id: session.user.id,
      story_id: storyId,
      progress,
    });
  }

  return NextResponse.json({ ok: true });
}
