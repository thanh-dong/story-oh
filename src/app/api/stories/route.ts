import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const [data] = await db
    .insert(stories)
    .values({
      title: body.title,
      summary: body.summary,
      age_range: body.age_range,
      price: body.price ?? 0,
      cover_image: body.cover_image ?? null,
      require_login: body.require_login ?? false,
      story_tree: body.story_tree,
      created_by: session.user.id,
    })
    .returning();

  return NextResponse.json(data, { status: 201 });
}
