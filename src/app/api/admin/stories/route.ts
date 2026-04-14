import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await db.select().from(stories).where(isNull(stories.created_by)).orderBy(desc(stories.created_at));
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    })
    .returning();

  return NextResponse.json(data, { status: 201 });
}
