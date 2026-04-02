import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(
      and(eq(stories.id, id), eq(stories.created_by, session.user.id))
    );

  if (!story) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(story);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [existing] = await db
    .select({ created_by: stories.created_by })
    .from(stories)
    .where(eq(stories.id, id));

  if (!existing || existing.created_by !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const [data] = await db
    .update(stories)
    .set({
      title: body.title,
      summary: body.summary,
      age_range: body.age_range,
      price: body.price ?? 0,
      cover_image: body.cover_image ?? null,
      require_login: body.require_login ?? false,
      story_tree: body.story_tree,
    })
    .where(eq(stories.id, id))
    .returning();

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [existing] = await db
    .select({ created_by: stories.created_by })
    .from(stories)
    .where(eq(stories.id, id));

  if (!existing || existing.created_by !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(stories).where(eq(stories.id, id));
  return NextResponse.json({ success: true });
}
