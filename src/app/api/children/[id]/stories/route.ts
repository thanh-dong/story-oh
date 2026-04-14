import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories } from "@/lib/db/schema";
import { and, eq, or, isNull, inArray } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // All available stories: public + parent-created + explicitly assigned
  const assignedRows = await db
    .select({ storyId: childStories.storyId })
    .from(childStories)
    .where(eq(childStories.childId, id));
  const assignedIds = assignedRows.map((r) => r.storyId);

  const conditions = [
    isNull(stories.created_by),
    eq(stories.created_by, session.user.id),
  ];
  if (assignedIds.length > 0) {
    conditions.push(inArray(stories.id, assignedIds));
  }

  const storyList = await db
    .select()
    .from(stories)
    .where(or(...conditions));

  const progressRows = await db
    .select()
    .from(userStories)
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.child_id, id)
      )
    );
  const progressMap = new Map(
    progressRows.map((r) => [r.story_id, r.progress])
  );

  const result = storyList.map((story) => ({
    ...story,
    progress: progressMap.get(story.id) ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.storyId) {
    return NextResponse.json({ error: "storyId is required" }, { status: 400 });
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, body.storyId));

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  await db
    .insert(childStories)
    .values({ childId: id, storyId: body.storyId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true }, { status: 201 });
}
