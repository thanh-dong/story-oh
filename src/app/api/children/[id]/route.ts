import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  return NextResponse.json(child);
}

export async function PUT(
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
  const [updated] = await db
    .update(children)
    .set({
      name: body.name ?? child.name,
      dateOfBirth: body.dateOfBirth ?? child.dateOfBirth,
      avatar: body.avatar ?? child.avatar,
      nativeLanguage: body.nativeLanguage ?? child.nativeLanguage,
      learningLanguages: body.learningLanguages ?? child.learningLanguages,
      interests: body.interests ?? child.interests,
      dailyGoalMinutes: body.dailyGoalMinutes !== undefined ? body.dailyGoalMinutes : child.dailyGoalMinutes,
    })
    .where(eq(children.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
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

  await db.delete(children).where(eq(children.id, id));
  return NextResponse.json({ ok: true });
}
