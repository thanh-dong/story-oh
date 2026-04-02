import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const data = await db.select().from(stories).orderBy(desc(stories.created_at));
  return NextResponse.json(data);
}

export async function POST(request: Request) {
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
    })
    .returning();

  return NextResponse.json(data, { status: 201 });
}
