// src/app/api/vocabulary/plans/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { estimateVocabularyCost } from "@/lib/vocabulary-credits";
import {
  generateVocabularyPlan,
  countWordsInPlan,
} from "@/lib/vocabulary-generation";
import type { CreatePlanRequest } from "@/lib/vocabulary-types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePlanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.childId || !body.learningLanguage || !body.weeksRequested) {
    return NextResponse.json(
      { error: "childId, learningLanguage, and weeksRequested are required" },
      { status: 400 }
    );
  }

  if (body.weeksRequested < 1 || body.weeksRequested > 4) {
    return NextResponse.json(
      { error: "weeksRequested must be between 1 and 4" },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(body.childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Check no active/approved plan exists for this child+language
  const existing = await db
    .select({ id: vocabularyPlans.id })
    .from(vocabularyPlans)
    .where(
      and(
        eq(vocabularyPlans.childId, body.childId),
        eq(vocabularyPlans.learningLanguage, body.learningLanguage),
        inArray(vocabularyPlans.status, ["active", "approved"])
      )
    );

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error:
          "An active plan already exists for this child and language. Complete or cancel it first.",
      },
      { status: 409 }
    );
  }

  const age = calculateAge(child.dateOfBirth);
  const creditsCost = estimateVocabularyCost(body.weeksRequested, age);

  // Generate plan via AI
  const result = await generateVocabularyPlan({
    childName: child.name,
    childAge: age,
    interests: child.interests,
    nativeLanguage: child.nativeLanguage,
    learningLanguage: body.learningLanguage,
    weeksRequested: body.weeksRequested,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  // Calculate next Monday as week start date
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const weekStartDate = nextMonday.toISOString().split("T")[0];

  const wordsTotal = countWordsInPlan(result.data.plan);

  const [plan] = await db
    .insert(vocabularyPlans)
    .values({
      childId: body.childId,
      userId: session.user.id,
      learningLanguage: body.learningLanguage,
      nativeLanguage: child.nativeLanguage,
      weekStartDate,
      weeksRequested: body.weeksRequested,
      status: "draft",
      creditsCost,
      wordsTotal,
      wordsAudioReady: 0,
      plan: result.data.plan,
    })
    .returning();

  return NextResponse.json(plan, { status: 201 });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const plans = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.childId, childId))
    .orderBy(desc(vocabularyPlans.createdAt));

  return NextResponse.json(plans);
}
