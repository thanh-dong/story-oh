import { db } from "@/lib/db";
import { appConfig } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const CONFIG_KEYS = {
  v1MaxDraftsPerWindow: "v1_max_drafts_per_window",
} as const;

export async function getConfigNumber(key: string, fallback: number): Promise<number> {
  try {
    const [row] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    if (!row) return fallback;
    if (typeof row.value === "number" && Number.isFinite(row.value)) return row.value;
  } catch {
    // table missing or other db error → fall back silently
  }
  return fallback;
}

export async function setConfigNumber(key: string, value: number): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updated_at: sql`now()` },
    });
}
