import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  user as userTable,
  guestStoryDrafts,
  stories,
  userStories,
  children,
  type GuestDraftConfig,
} from "./db/schema";
import { readGuestId } from "./guest-id";
import { ageBandToDateOfBirth } from "./v1-age-band";
import type { GenerateStoryResponse } from "./types";

// Runs after better-auth has committed a new user. If the new user just came
// out of the /v1 anonymous funnel, we claim their pending draft (story + child)
// in a transaction. If the transaction fails, we delete the user so the funnel
// is "all-or-nothing" — no orphan accounts.
//
// Side-effect-free for any signup that isn't tied to a guest cookie (Google
// signups from /signup, admin-created users, etc. — the hook silently no-ops).
async function claimGuestDraftForUser(userId: string): Promise<void> {
  let guestId: string | null = null;
  try {
    guestId = await readGuestId();
  } catch {
    return; // not in a request scope with cookies — nothing to claim
  }
  if (!guestId) return;

  const windowStart = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [draft] = await db
    .select()
    .from(guestStoryDrafts)
    .where(
      and(
        eq(guestStoryDrafts.guest_id, guestId),
        eq(guestStoryDrafts.status, "ready"),
        isNull(guestStoryDrafts.claimed_user_id),
        gte(guestStoryDrafts.created_at, windowStart),
      ),
    )
    .orderBy(desc(guestStoryDrafts.created_at))
    .limit(1);

  if (!draft || !draft.story_json) return;

  const storyData = draft.story_json as GenerateStoryResponse;
  const config = draft.config_json as GuestDraftConfig;

  await db.transaction(async (tx) => {
    const [newStory] = await tx
      .insert(stories)
      .values({
        title: storyData.title,
        summary: storyData.summary,
        age_range: storyData.age_range,
        cover_image: storyData.cover_image ?? null,
        story_tree: storyData.story_tree,
        created_by: userId,
      })
      .returning({ id: stories.id });

    await tx.insert(userStories).values({
      user_id: userId,
      story_id: newStory.id,
    });

    const childName = config.mainCharacterName?.trim();
    if (childName) {
      const [newChild] = await tx
        .insert(children)
        .values({
          parentId: userId,
          name: childName,
          dateOfBirth: ageBandToDateOfBirth(config.ageBand),
          avatar: "default",
          nativeLanguage: config.language ?? "en",
          learningLanguages: [config.language ?? "en"],
          interests: config.interests ?? [],
        })
        .returning({ id: children.id });

      await tx
        .update(userStories)
        .set({ child_id: newChild.id })
        .where(
          and(
            eq(userStories.user_id, userId),
            eq(userStories.story_id, newStory.id),
          ),
        );
    }

    const updated = await tx
      .update(guestStoryDrafts)
      .set({ claimed_user_id: userId })
      .where(
        and(
          eq(guestStoryDrafts.id, draft.id),
          isNull(guestStoryDrafts.claimed_user_id),
        ),
      )
      .returning({ id: guestStoryDrafts.id });

    if (updated.length === 0) {
      throw new Error("Draft was claimed concurrently");
    }
  });
}

const isDev = process.env.NODE_ENV === "development";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === "development" ? "dev-only-not-for-production" : (() => { throw new Error("BETTER_AUTH_SECRET env var is required in production"); })()),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: isDev ? ["*.trycloudflare.com"] : [],
  emailAndPassword: {
    enabled: true,
    // We do NOT block sign-in on email verification. The /v1 warm-lead funnel
    // needs to claim the just-generated story immediately after signup — that
    // can't happen if the session is gated on a verification email round-trip.
    // Users can still verify later; password reset still requires email
    // ownership, which is the security-sensitive path.
    requireEmailVerification: false,
    autoSignIn: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            await claimGuestDraftForUser(createdUser.id);
          } catch {
            // Atomicity: compensating delete (cascades to session/account)
            // so the funnel is "all-or-nothing".
            try {
              await db.delete(userTable).where(eq(userTable.id, createdUser.id));
            } catch {
              // best-effort cleanup
            }
            throw new Error("Could not save your story. Please try again.");
          }
        },
      },
    },
  },
});

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type Session = typeof auth.$Infer.Session;
