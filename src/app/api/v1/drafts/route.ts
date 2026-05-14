import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestStoryDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateGuestId, hashIp } from "@/lib/guest-id";
import { checkDraftRateLimit } from "@/lib/v1-rate-limit";
import { mapV1ConfigToGenerateRequest } from "@/lib/v1-mapping";
import { generateStory } from "@/lib/story-generation";
import type { GuestDraftConfig } from "@/lib/db/schema";

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function validateConfig(body: unknown): { valid: true; data: GuestDraftConfig } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (b.ageBand !== "4-6" && b.ageBand !== "6-8" && b.ageBand !== "8-12") {
    return { valid: false, error: "ageBand must be '4-6', '6-8', or '8-12'" };
  }
  if (b.length !== "quick" && b.length !== "standard" && b.length !== "longer") {
    return { valid: false, error: "length must be 'quick', 'standard', or 'longer'" };
  }
  if (!Array.isArray(b.interests) || b.interests.some((i) => typeof i !== "string")) {
    return { valid: false, error: "interests must be an array of strings" };
  }
  if (typeof b.idea !== "string") {
    return { valid: false, error: "idea must be a string" };
  }
  if (typeof b.lesson !== "string") {
    return { valid: false, error: "lesson must be a string" };
  }
  // Language is optional; default to "en" for back-compat with old clients.
  const language: GuestDraftConfig["language"] =
    b.language === "vi" || b.language === "de" ? b.language : "en";

  // Main character name is optional. Trim and cap length to avoid prompt abuse.
  const mainCharacterName =
    typeof b.mainCharacterName === "string" && b.mainCharacterName.trim()
      ? b.mainCharacterName.trim().slice(0, 60)
      : undefined;

  return {
    valid: true,
    data: {
      ageBand: b.ageBand,
      length: b.length,
      language,
      interests: b.interests as string[],
      idea: b.idea,
      lesson: b.lesson,
      ...(mainCharacterName ? { mainCharacterName } : {}),
    },
  };
}

export async function POST(request: Request) {
  const guestId = await getOrCreateGuestId();

  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const ipHash = hashIp(rawIp);

  const rateLimit = await checkDraftRateLimit(guestId, ipHash);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.reason }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateConfig(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const config = validation.data;
  const generateReq = mapV1ConfigToGenerateRequest(config);

  const expiresAt = new Date(Date.now() + DRAFT_TTL_MS).toISOString();

  const [draft] = await db
    .insert(guestStoryDrafts)
    .values({
      guest_id: guestId,
      ip_hash: ipHash,
      config_json: config,
      status: "generating",
      expires_at: expiresAt,
    })
    .returning({ id: guestStoryDrafts.id });

  const result = await generateStory(generateReq);

  if (!result.ok) {
    await db
      .update(guestStoryDrafts)
      .set({ status: "failed" })
      .where(eq(guestStoryDrafts.id, draft.id));
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const storyJson = {
    title: result.data.title,
    summary: result.data.summary,
    age_range: result.data.age_range,
    story_tree: result.data.story_tree,
  };

  await db
    .update(guestStoryDrafts)
    .set({ story_json: storyJson, status: "ready" })
    .where(eq(guestStoryDrafts.id, draft.id));

  return NextResponse.json(
    {
      draftId: draft.id,
      status: "ready",
      story: storyJson,
    },
    { status: 201 }
  );
}
