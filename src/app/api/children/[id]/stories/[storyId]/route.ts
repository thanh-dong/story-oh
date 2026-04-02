import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; storyId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, storyId } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(childStories)
    .where(
      and(eq(childStories.childId, id), eq(childStories.storyId, storyId))
    );

  return NextResponse.json({ ok: true });
}
