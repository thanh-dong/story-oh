import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";
import type { RecordProgressRequest } from "@/lib/vocabulary-types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RecordProgressRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.wordId || !body.planId || !body.childId || !body.type) {
    return NextResponse.json(
      { error: "wordId, planId, childId, and type are required" },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(body.childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.childId, body.childId),
        eq(vocabularyProgress.wordId, body.wordId)
      )
    );

  if (body.type === "listened") {
    if (existing) {
      await db
        .update(vocabularyProgress)
        .set({
          listened: true,
          listenedAt: new Date().toISOString(),
        })
        .where(eq(vocabularyProgress.id, existing.id));
    } else {
      await db.insert(vocabularyProgress).values({
        childId: body.childId,
        wordId: body.wordId,
        planId: body.planId,
        listened: true,
        listenedAt: new Date().toISOString(),
      });
    }
  } else if (body.type === "quiz") {
    const quizCorrect = body.quizCorrect ?? false;
    if (existing) {
      await db
        .update(vocabularyProgress)
        .set({
          quizCorrect,
          quizAttempts: existing.quizAttempts + 1,
          quizzedAt: new Date().toISOString(),
        })
        .where(eq(vocabularyProgress.id, existing.id));
    } else {
      await db.insert(vocabularyProgress).values({
        childId: body.childId,
        wordId: body.wordId,
        planId: body.planId,
        quizCorrect,
        quizAttempts: 1,
        quizzedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
