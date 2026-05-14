import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestStoryDrafts } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { WINDOW_HOURS } from "@/lib/v1-rate-limit";
import { getOrCreateGuestId } from "@/lib/guest-id";
import { buildMagicPrompt } from "@/lib/v1-magic-prompt";
import { MAX_MAGIC_TAPS } from "@/lib/v1-rate-limit";

export async function POST(request: Request) {
  const guestId = await getOrCreateGuestId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  // Magic happens on the Idea step, BEFORE a draft is generated. We track taps
  // against the most-recent un-claimed draft for this guest within the window
  // (post-draft session continuation), but allow the call when no draft exists
  // yet (pre-generation). The first POST /api/v1/drafts will start a fresh row.
  const windowStart = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const [draft] = await db
    .select()
    .from(guestStoryDrafts)
    .where(
      and(
        eq(guestStoryDrafts.guest_id, guestId),
        gte(guestStoryDrafts.created_at, windowStart),
        isNull(guestStoryDrafts.claimed_user_id),
      ),
    )
    .orderBy(desc(guestStoryDrafts.created_at))
    .limit(1);

  if (draft && draft.magic_count >= MAX_MAGIC_TAPS) {
    return NextResponse.json(
      { error: "Magic suggestion limit reached" },
      { status: 429 }
    );
  }

  if (typeof b.ageBand !== "string" || !Array.isArray(b.interests)) {
    return NextResponse.json(
      { error: "ageBand and interests are required" },
      { status: 400 }
    );
  }

  const prompt = buildMagicPrompt({
    ageBand: b.ageBand as "4-6" | "6-8" | "8-12",
    interests: (b.interests as unknown[]).filter((x): x is string => typeof x === "string"),
    idea: typeof b.idea === "string" ? b.idea : undefined,
    lesson: typeof b.lesson === "string" ? b.lesson : undefined,
  });

  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL;

  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    return NextResponse.json({ error: "AI provider not configured." }, { status: 500 });
  }

  let llmResponse: Response;
  try {
    llmResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.9,
        max_completion_tokens: 256,
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "AI request timed out. Please try again."
        : "Failed to connect to AI provider.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!llmResponse.ok) {
    return NextResponse.json({ error: "AI provider error" }, { status: 500 });
  }

  let json: { choices?: { message?: { content?: string } }[] };
  try {
    json = await llmResponse.json();
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "AI returned an empty response" }, { status: 500 });
  }

  let suggestion: { idea?: unknown; lesson?: unknown };
  try {
    suggestion = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
  }

  if (typeof suggestion.idea !== "string" || typeof suggestion.lesson !== "string") {
    return NextResponse.json({ error: "AI response missing idea or lesson" }, { status: 500 });
  }

  let nextCount = 1;
  if (draft) {
    await db
      .update(guestStoryDrafts)
      .set({ magic_count: sql`${guestStoryDrafts.magic_count} + 1` })
      .where(eq(guestStoryDrafts.id, draft.id));
    nextCount = draft.magic_count + 1;
  }
  // TODO(user): when no draft exists yet, magic taps are not yet persisted —
  // the rate limit only kicks in once the first draft row is created. If
  // pre-draft magic abuse becomes a problem, persist a counter cookie or a
  // separate tracker keyed by guest_id.

  return NextResponse.json({
    idea: suggestion.idea,
    lesson: suggestion.lesson,
    magic_remaining: MAX_MAGIC_TAPS - nextCount,
  });
}
