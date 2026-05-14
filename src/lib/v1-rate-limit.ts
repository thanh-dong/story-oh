import { db } from "@/lib/db";
import { guestStoryDrafts } from "@/lib/db/schema";
import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import { CONFIG_KEYS, getConfigNumber } from "@/lib/app-config";

// TODO(user): decide policy.
//  - Currently: a guest is rate-limited if EITHER their cookie OR their IP hash
//    has produced a draft in the last WINDOW_HOURS. This is strict: a household
//    with 3 devices behind NAT gets one free preview between them.
//  - Loosening to AND lets each device generate once but invites cookie-clearing
//    abuse from a single bad actor.
//  - Alternative: count only CLAIMED drafts toward the limit, so users who
//    abandon don't burn their one shot. Currently we count all drafts.

export const DEFAULT_MAX_DRAFTS_PER_WINDOW = 1;
export const WINDOW_HOURS = 24;
export const MAX_MAGIC_TAPS = 3;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function getMaxDraftsPerWindow(): Promise<number> {
  const n = await getConfigNumber(
    CONFIG_KEYS.v1MaxDraftsPerWindow,
    DEFAULT_MAX_DRAFTS_PER_WINDOW,
  );
  return Math.max(0, Math.floor(n));
}

export async function checkDraftRateLimit(
  guestId: string,
  ipHash: string,
): Promise<RateLimitResult> {
  const max = await getMaxDraftsPerWindow();
  // 0 = unlimited (admin override): skip the check entirely
  if (max <= 0) return { ok: true };

  const windowStart = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();

  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guestStoryDrafts)
    .where(
      and(
        or(eq(guestStoryDrafts.guest_id, guestId), eq(guestStoryDrafts.ip_hash, ipHash)),
        gte(guestStoryDrafts.created_at, windowStart),
        // TODO(user): toggle isNull line to count only un-claimed drafts.
        isNull(guestStoryDrafts.claimed_user_id),
      ),
    );

  const count = rows[0]?.count ?? 0;
  if (count >= max) {
    return {
      ok: false,
      reason:
        max === 1
          ? "You've already created one free preview. Sign up to make more stories."
          : `You've reached the limit of ${max} free previews. Sign up to make more stories.`,
    };
  }
  return { ok: true };
}
