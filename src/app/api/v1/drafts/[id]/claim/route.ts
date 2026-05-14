import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestStoryDrafts, stories, userStories, children } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { readGuestId } from "@/lib/guest-id";
import type { GenerateStoryResponse } from "@/lib/types";
import type { GuestDraftConfig } from "@/lib/db/schema";
import { ageBandToDateOfBirth } from "@/lib/v1-age-band";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guestId = await readGuestId();
  if (!guestId) {
    return NextResponse.json({ error: "No guest session found" }, { status: 400 });
  }

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

  if (typeof b.storyName !== "string" || b.storyName.trim() === "") {
    return NextResponse.json({ error: "storyName is required" }, { status: 400 });
  }
  const storyName = b.storyName.trim();
  const childName = typeof b.childName === "string" && b.childName.trim() ? b.childName.trim() : null;

  const [draft] = await db
    .select()
    .from(guestStoryDrafts)
    .where(eq(guestStoryDrafts.id, id));

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.guest_id !== guestId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  if (draft.expires_at < nowIso) {
    return NextResponse.json({ error: "Draft has expired" }, { status: 410 });
  }

  if (draft.status !== "ready" || !draft.story_json) {
    return NextResponse.json({ error: "Draft is not ready to claim" }, { status: 409 });
  }

  if (draft.claimed_user_id !== null) {
    return NextResponse.json({ error: "Draft already claimed" }, { status: 409 });
  }

  const storyData = draft.story_json as GenerateStoryResponse;
  const config = draft.config_json as GuestDraftConfig;

  // If the parent ticked "Create child profile", populate the child row from
  // the v1 config (interests, language, age band) — much richer than the
  // previous hardcoded default. The parent can edit later in the dashboard.
  const childToCreate = childName
    ? {
        name: childName,
        dateOfBirth: ageBandToDateOfBirth(config.ageBand),
        avatar: "default",
        nativeLanguage: config.language ?? "en",
        learningLanguages: [config.language ?? "en"],
        interests: config.interests ?? [],
      }
    : null;

  let storyId: string;
  try {
    storyId = await db.transaction(async (tx) => {
      const [newStory] = await tx
        .insert(stories)
        .values({
          title: storyName,
          summary: storyData.summary,
          age_range: storyData.age_range,
          cover_image: storyData.cover_image ?? null,
          story_tree: storyData.story_tree,
          created_by: session.user.id,
        })
        .returning({ id: stories.id });

      await tx.insert(userStories).values({
        user_id: session.user.id,
        story_id: newStory.id,
      });

      if (childToCreate) {
        const [newChild] = await tx
          .insert(children)
          .values({
            parentId: session.user.id,
            ...childToCreate,
          })
          .returning({ id: children.id });

        await tx
          .update(userStories)
          .set({ child_id: newChild.id })
          .where(
            and(
              eq(userStories.user_id, session.user.id),
              eq(userStories.story_id, newStory.id),
            )
          );
      }

      await tx
        .update(guestStoryDrafts)
        .set({ claimed_user_id: session.user.id })
        .where(
          and(eq(guestStoryDrafts.id, id), isNull(guestStoryDrafts.claimed_user_id))
        );

      return newStory.id;
    });
  } catch {
    return NextResponse.json({ error: "Failed to claim draft" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storyId });
}
