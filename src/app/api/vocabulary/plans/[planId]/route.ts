import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans, vocabularyWords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const words = await db
    .select()
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  return NextResponse.json({ ...plan, words });
}
