import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.user.id));

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name || !body.dateOfBirth || !body.avatar) {
    return NextResponse.json(
      { error: "name, dateOfBirth, and avatar are required" },
      { status: 400 }
    );
  }

  const [child] = await db
    .insert(children)
    .values({
      parentId: session.user.id,
      name: body.name,
      dateOfBirth: body.dateOfBirth,
      avatar: body.avatar,
      nativeLanguage: body.nativeLanguage ?? "en",
      learningLanguages: body.learningLanguages ?? ["en"],
      interests: body.interests ?? [],
      dailyGoalMinutes: body.dailyGoalMinutes ?? null,
    })
    .returning();

  return NextResponse.json(child, { status: 201 });
}
