import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories as storiesTable } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limitNum = limitParam ? parseInt(limitParam, 10) : null;

    let query = db
      .select()
      .from(storiesTable)
      .where(
        and(
          isNull(storiesTable.created_by),
          eq(storiesTable.require_login, false)
        )
      )
      .orderBy(desc(storiesTable.created_at));

    if (limitNum && limitNum > 0 && limitNum <= 100) {
      query = query.limit(limitNum) as typeof query;
    }

    const storyList = await query;

    return NextResponse.json(storyList, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
