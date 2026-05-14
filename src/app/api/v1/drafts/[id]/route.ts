import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guestStoryDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readGuestId } from "@/lib/guest-id";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guestId = await readGuestId();
  if (!guestId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [draft] = await db
    .select()
    .from(guestStoryDrafts)
    .where(eq(guestStoryDrafts.id, id));

  if (!draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (draft.guest_id !== guestId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  if (draft.expires_at < nowIso) {
    return NextResponse.json({ error: "Draft has expired" }, { status: 410 });
  }

  return NextResponse.json({
    id: draft.id,
    status: draft.status,
    config: draft.config_json,
    story: draft.story_json ?? null,
    magic_count: draft.magic_count,
    claimed: draft.claimed_user_id !== null,
    expires_at: draft.expires_at,
  });
}
