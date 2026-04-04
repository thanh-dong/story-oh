import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");

  if (!childId) {
    return NextResponse.json(
      { error: "childId is required" },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const progress = await db
    .select()
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.planId, planId),
        eq(vocabularyProgress.childId, childId)
      )
    );

  return NextResponse.json(progress);
}
