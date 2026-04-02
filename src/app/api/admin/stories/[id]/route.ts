import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(stories).where(eq(stories.id, id));
  return NextResponse.json({ success: true });
}
