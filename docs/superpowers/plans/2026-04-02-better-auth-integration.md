# Better-Auth Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase Auth + JS client with better-auth + Drizzle ORM, keeping the same Supabase Postgres database.

**Architecture:** Better-auth handles authentication (email/password, Google OAuth, sessions, admin roles). Drizzle ORM handles all database queries via `DATABASE_URL`. The middleware protects admin routes. A new progress API replaces client-side Supabase calls.

**Tech Stack:** Next.js 16, better-auth, Drizzle ORM, pg driver, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-02-better-auth-integration-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `src/lib/db/index.ts` | Create | Drizzle pg client connection |
| `src/lib/db/schema.ts` | Create | All table definitions (stories, userStories) |
| `src/lib/auth.ts` | Create | Better-auth server config + getSession helper |
| `src/lib/auth-client.ts` | Create | Better-auth browser client |
| `src/app/api/auth/[...all]/route.ts` | Create | Better-auth catch-all handler |
| `src/app/api/stories/[id]/progress/route.ts` | Create | Progress saving API |
| `src/app/signup/page.tsx` | Create | Signup page |
| `src/lib/db/seed.ts` | Create | Dev seed script |
| `drizzle.config.ts` | Create | Drizzle Kit config |
| `src/middleware.ts` | Rewrite | Admin route protection |
| `src/app/api/admin/stories/route.ts` | Rewrite | Drizzle queries |
| `src/app/api/admin/stories/[id]/route.ts` | Rewrite | Drizzle queries |
| `src/app/explore/page.tsx` | Modify | Drizzle query |
| `src/app/page.tsx` | Modify | Drizzle query |
| `src/app/story/[id]/page.tsx` | Modify | Drizzle query |
| `src/app/story/[id]/read/page.tsx` | Rewrite | Drizzle + better-auth session |
| `src/app/library/page.tsx` | Rewrite | Drizzle join + better-auth session |
| `src/app/login/page.tsx` | Rewrite | better-auth signIn |
| `src/components/navbar.tsx` | Rewrite | useSession from better-auth |
| `src/components/story-reader.tsx` | Modify | Fetch progress API instead of Supabase |
| `src/lib/supabase/*` | Delete | Replaced |
| `src/app/api/dev-login/route.ts` | Delete | Replaced |
| `src/app/auth/callback/route.ts` | Delete | Replaced |

---

### Task 1: Install Dependencies & Configure

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Modify: `.env.local`

- [ ] **Step 1: Install new dependencies**

```bash
npm install better-auth drizzle-orm pg
npm install -D drizzle-kit @types/pg tsx
```

- [ ] **Step 2: Remove Supabase dependencies**

```bash
npm uninstall @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 3: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Update `.env.local`**

Replace Supabase env vars with:

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
BETTER_AUTH_SECRET=a-random-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o
```

The `DATABASE_URL` is the Supabase connection string from Project Settings > Database > Connection string > URI.

- [ ] **Step 5: Add db scripts to package.json**

Add to `"scripts"`:
```json
"db:push": "drizzle-kit push",
"db:seed": "tsx src/lib/db/seed.ts",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 6: Verify dependencies install**

Run: `npm install`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts
git commit -m "chore: replace supabase deps with better-auth + drizzle"
```

---

### Task 2: Database Layer (Drizzle Schema + Client)

**Files:**
- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/schema.ts`

- [ ] **Step 1: Create the Drizzle client**

Create `src/lib/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

- [ ] **Step 2: Create the schema**

Create `src/lib/db/schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { StoryTree } from "@/lib/types";

// ─── App Tables ───

export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  cover_image: text("cover_image"),
  price: real("price").notNull().default(0),
  age_range: text("age_range").notNull().default("4-8"),
  require_login: boolean("require_login").notNull().default(false),
  story_tree: jsonb("story_tree").$type<StoryTree>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const userStories = pgTable(
  "user_stories",
  {
    user_id: text("user_id").notNull(),
    story_id: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    progress: jsonb("progress")
      .$type<{ current_node: string; history: string[] }>()
      .default({ current_node: "start", history: ["start"] }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.story_id] })]
);
```

Note: `user_id` does not have a FK reference to the user table yet — we add that after better-auth creates the user table. The FK constraint from the old Supabase `auth.users` needs to be dropped first (Task 3).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: May have errors from removed Supabase imports — that's expected at this stage.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add Drizzle schema and client"
```

---

### Task 3: Database Migration

Run SQL against the Supabase database to prepare for better-auth.

- [ ] **Step 1: Drop old auth constraints and RLS**

Run this SQL against the Supabase database (via Supabase Dashboard SQL Editor or `psql`):

```sql
-- Drop FK from user_stories to auth.users
ALTER TABLE public.user_stories DROP CONSTRAINT IF EXISTS user_stories_user_id_fkey;

-- Change user_id from uuid to text
ALTER TABLE public.user_stories ALTER COLUMN user_id TYPE text USING user_id::text;

-- Drop RLS policies
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Users can view own stories" ON public.user_stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON public.user_stories;
DROP POLICY IF EXISTS "Users can update own stories" ON public.user_stories;

-- Disable RLS
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories DISABLE ROW LEVEL SECURITY;

-- Delete orphaned user_stories (old Supabase auth user IDs)
DELETE FROM public.user_stories;
```

- [ ] **Step 2: Push Drizzle schema**

Run: `npx drizzle-kit push`

This will create the better-auth tables (`user`, `account`, `session`, `verification`) alongside the existing app tables. Drizzle will recognize the existing `stories` and `user_stories` tables and skip them.

Expected: Tables created successfully. No data loss.

- [ ] **Step 3: Commit schema migration note**

```bash
git add drizzle/
git commit -m "chore: database migration - drop RLS, prepare for better-auth"
```

---

### Task 4: Better-Auth Server Config

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Create auth config**

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "./db";

const isDev = process.env.NODE_ENV === "development";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !isDev,
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
});

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Create catch-all route handler**

Create `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build passes (existing Supabase imports will fail — we fix those in later tasks).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/
git commit -m "feat: add better-auth server config and API route"
```

---

### Task 5: Better-Auth Browser Client

**Files:**
- Create: `src/lib/auth-client.ts`

- [ ] **Step 1: Create the client**

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "",
});

export const { useSession, signIn, signUp, signOut } = authClient;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth-client.ts
git commit -m "feat: add better-auth browser client"
```

---

### Task 6: Middleware (Admin Protection)

**Files:**
- Rewrite: `src/middleware.ts`
- Delete: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Rewrite middleware**

Replace `src/middleware.ts` with:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 2: Delete old Supabase middleware**

```bash
rm src/lib/supabase/middleware.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git rm src/lib/supabase/middleware.ts
git commit -m "feat: replace Supabase middleware with better-auth admin guard"
```

---

### Task 7: Migrate Admin API Routes to Drizzle

**Files:**
- Rewrite: `src/app/api/admin/stories/route.ts`
- Rewrite: `src/app/api/admin/stories/[id]/route.ts`

- [ ] **Step 1: Rewrite stories list/create route**

Replace `src/app/api/admin/stories/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const data = await db.select().from(stories).orderBy(desc(stories.created_at));
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const [data] = await db
    .insert(stories)
    .values({
      title: body.title,
      summary: body.summary,
      age_range: body.age_range,
      price: body.price ?? 0,
      cover_image: body.cover_image ?? null,
      require_login: body.require_login ?? false,
      story_tree: body.story_tree,
    })
    .returning();

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Rewrite stories update/delete route**

Replace `src/app/api/admin/stories/[id]/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const [data] = await db
    .update(stories)
    .set({
      title: body.title,
      summary: body.summary,
      age_range: body.age_range,
      price: body.price ?? 0,
      cover_image: body.cover_image ?? null,
      require_login: body.require_login ?? false,
      story_tree: body.story_tree,
    })
    .where(eq(stories.id, id))
    .returning();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(stories).where(eq(stories.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/stories/
git commit -m "feat: migrate admin API routes to Drizzle"
```

---

### Task 8: Migrate Public Pages to Drizzle

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/story/[id]/page.tsx`

- [ ] **Step 1: Update home page**

In `src/app/page.tsx`, replace:
```typescript
import { createClient } from "@/lib/supabase/server";
```
with:
```typescript
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
```

Replace the query block:
```typescript
  const supabase = await createClient();
  let stories: Story[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<Story[]>();
    if (data) stories = data;
  }
```
with:
```typescript
  const storyList = await db
    .select()
    .from(stories)
    .orderBy(desc(stories.created_at))
    .limit(3);
```

Update the JSX to use `storyList` instead of `stories` (the variable, not the table):
```typescript
  {storyList.length > 0 && (
    ...
    {storyList.map((story) => (
```

Remove the `Story` type import if no longer needed.

- [ ] **Step 2: Update explore page**

In `src/app/explore/page.tsx`, replace the Supabase import and query:

```typescript
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
```

Replace query:
```typescript
  const storyList = await db.select().from(stories);
```

Update JSX references from the old `stories` array variable to `storyList`.

- [ ] **Step 3: Update story detail page**

In `src/app/story/[id]/page.tsx`, replace Supabase imports:
```typescript
import { db } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
```

Replace query:
```typescript
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, id));

  if (!story) notFound();
```

Remove the `createClient` import and Supabase null check.

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: These three pages should compile. Other pages may still fail.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/explore/page.tsx src/app/story/
git commit -m "feat: migrate public pages to Drizzle queries"
```

---

### Task 9: Progress API Route

**Files:**
- Create: `src/app/api/stories/[id]/progress/route.ts`

- [ ] **Step 1: Create progress route**

Create `src/app/api/stories/[id]/progress/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: storyId } = await params;
  const body = await request.json();
  const progress = {
    current_node: body.current_node,
    history: body.history,
  };

  const [existing] = await db
    .select()
    .from(userStories)
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId)
      )
    );

  if (existing) {
    await db
      .update(userStories)
      .set({ progress })
      .where(
        and(
          eq(userStories.user_id, session.user.id),
          eq(userStories.story_id, storyId)
        )
      );
  } else {
    await db.insert(userStories).values({
      user_id: session.user.id,
      story_id: storyId,
      progress,
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/stories/
git commit -m "feat: add progress saving API route"
```

---

### Task 10: Migrate Authenticated Pages

**Files:**
- Rewrite: `src/app/story/[id]/read/page.tsx`
- Rewrite: `src/app/library/page.tsx`

- [ ] **Step 1: Rewrite story read page**

Replace `src/app/story/[id]/read/page.tsx` with:

```typescript
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories, userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { StoryReader } from "@/components/story-reader";
import type { Story } from "@/lib/types";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, id));

  if (!story) notFound();

  const session = await getSession();

  if (story.require_login && !session) {
    redirect(`/login?next=/story/${id}/read`);
  }

  let progress = { current_node: "start", history: ["start"] };
  if (session) {
    const [existing] = await db
      .select()
      .from(userStories)
      .where(
        and(
          eq(userStories.user_id, session.user.id),
          eq(userStories.story_id, id)
        )
      );

    if (existing) {
      progress = existing.progress ?? progress;
    } else {
      await db.insert(userStories).values({
        user_id: session.user.id,
        story_id: id,
      });
    }
  }

  return (
    <StoryReader
      story={story as Story}
      initialProgress={progress}
      userId={session?.user.id ?? null}
    />
  );
}
```

- [ ] **Step 2: Rewrite library page**

Replace `src/app/library/page.tsx` with:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories, userStories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story } from "@/lib/types";

export default async function LibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await db
    .select()
    .from(userStories)
    .innerJoin(stories, eq(userStories.story_id, stories.id))
    .where(eq(userStories.user_id, session.user.id));

  const userStoryList = rows.map((row) => ({
    ...row.user_stories,
    story: row.stories as Story,
  }));

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          My Library
        </h1>
        <p className="mt-2 text-muted-foreground">
          {userStoryList.length > 0
            ? `${userStoryList.length} ${userStoryList.length === 1 ? "adventure" : "adventures"} in your collection`
            : "Your adventures await"}
        </p>
      </div>

      {userStoryList.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {userStoryList.map((us) => {
            const story = us.story;
            const gradient = getGradient(story.title);
            const emoji = getStoryEmoji(story.title);
            const choicesMade = us.progress?.history?.length ?? 0;
            const currentNode = story.story_tree?.[us.progress?.current_node ?? ""];
            const isAtEnding = currentNode && currentNode.choices.length === 0;

            return (
              <Link
                key={us.story_id}
                href={`/story/${story.id}/read`}
                className="group block"
              >
                <article className="relative h-full overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                  <div
                    className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${gradient} sm:h-40`}
                  >
                    <span className="text-5xl drop-shadow-md transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                      {emoji}
                    </span>
                    {isAtEnding && (
                      <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                        Completed
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg font-bold leading-snug tracking-tight">
                      {story.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {choicesMade} {choicesMade === 1 ? "choice" : "choices"} made
                    </p>
                    <div className="mt-3">
                      <span className="inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary/90">
                        {isAtEnding ? "Read Again" : "Continue"}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-lg font-semibold">No stories yet</p>
          <p className="text-muted-foreground">
            Start exploring and add stories to your collection.
          </p>
          <Link href="/explore">
            <Button size="lg" className="mt-2 rounded-full px-8 font-bold">
              Explore Stories
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/story/ src/app/library/
git commit -m "feat: migrate authenticated pages to Drizzle + better-auth"
```

---

### Task 11: Migrate Story Reader (Client Component)

**Files:**
- Modify: `src/components/story-reader.tsx`

- [ ] **Step 1: Replace Supabase progress saving with fetch**

In `src/components/story-reader.tsx`:

Remove imports:
```typescript
import { createClient } from "@/lib/supabase/client";
```

Remove the `supabaseRef`:
```typescript
const supabaseRef = useRef(createClient());
```

Replace the `saveProgress` callback with:
```typescript
  const saveProgress = useCallback(
    async (nodeId: string, newHistory: string[]) => {
      if (!userId) return;
      fetch(`/api/stories/${story.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_node: nodeId, history: newHistory }),
      }).catch(() => {});
    },
    [story.id, userId]
  );
```

Remove the `useRef` import if no longer used.

- [ ] **Step 2: Commit**

```bash
git add src/components/story-reader.tsx
git commit -m "feat: replace Supabase client with progress API in reader"
```

---

### Task 12: Migrate Navbar

**Files:**
- Rewrite: `src/components/navbar.tsx`

- [ ] **Step 1: Replace Supabase auth with better-auth**

In `src/components/navbar.tsx`:

Remove:
```typescript
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
```

Add:
```typescript
import { useSession, signOut } from "@/lib/auth-client";
```

Replace the entire user state management block (useState, useRef, getSupabase, useEffect, handleLogout) with:

```typescript
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          setMobileMenuOpen(false);
          router.refresh();
        },
      },
    });
  };
```

Keep the `useState` import for `mobileMenuOpen`. Remove `useEffect` and `useRef` if no longer used.

The rest of the component stays the same — it already uses `user` for conditional rendering.

- [ ] **Step 2: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: replace Supabase auth with useSession in navbar"
```

---

### Task 13: Login & Signup Pages

**Files:**
- Rewrite: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`

- [ ] **Step 1: Rewrite login page**

Replace `src/app/login/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  const isDev = process.env.NODE_ENV === "development";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="flex flex-col items-center py-12 sm:py-20">
      <div className="w-full max-w-sm animate-fade-up space-y-6">
        <div className="text-center">
          <span className="inline-block text-5xl" aria-hidden="true">&#x1F4D6;</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome to StoryTime
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to save your reading progress
          </p>
        </div>

        <LoginForm isDev={isDev} hasGoogle={hasGoogle} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
```

Create `src/app/login/login-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  isDev,
  hasGoogle,
}: {
  isDev: boolean;
  hasGoogle: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await signIn.email({
      email,
      password,
      callbackURL: next,
    });

    if (authError) {
      setError(authError.message ?? "Invalid email or password");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  async function handleDevLogin(devEmail: string, devPassword: string) {
    setLoading(true);
    setError(null);
    const { error: authError } = await signIn.email({
      email: devEmail,
      password: devPassword,
      callbackURL: next,
    });
    if (authError) {
      setError(authError.message ?? "Failed to sign in");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-card p-6 storybook-shadow"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="rounded-xl"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-full text-base font-bold"
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        {hasGoogle && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => signIn.social({ provider: "google", callbackURL: next })}
              disabled={loading}
            >
              Continue with Google
            </Button>
          </>
        )}
      </form>

      {isDev && (
        <div className="rounded-2xl border border-dashed border-kid-orange/40 bg-kid-yellow/10 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-kid-orange">
            Dev Accounts
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-lg text-xs"
              onClick={() => handleDevLogin("admin@test.com", "password123")}
              disabled={loading}
            >
              Admin
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-lg text-xs"
              onClick={() => handleDevLogin("user@test.com", "password123")}
              disabled={loading}
            >
              User
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create signup page**

Create `src/app/signup/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/");

  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center py-12 sm:py-20">
      <div className="w-full max-w-sm animate-fade-up space-y-6">
        <div className="text-center">
          <span className="inline-block text-5xl" aria-hidden="true">&#x2728;</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Create an Account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Join StoryTime to track your reading adventures
          </p>
        </div>

        <SignupForm hasGoogle={hasGoogle} isDev={isDev} />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

Create `src/app/signup/signup-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm({ hasGoogle, isDev }: { hasGoogle: boolean; isDev: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
      callbackURL: next,
    });

    if (authError) {
      setError(authError.message ?? "Signup failed");
      setLoading(false);
    } else if (isDev) {
      // Dev mode: auto-verified, go straight in
      router.push(next);
      router.refresh();
    } else {
      // Prod: email verification required
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-parchment p-6 text-center storybook-shadow">
        <span className="text-4xl" aria-hidden="true">&#x2728;</span>
        <p className="mt-3 text-lg font-bold">Account created!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your email to verify your account, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-card p-6 storybook-shadow"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="rounded-xl"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-full text-base font-bold"
      >
        {loading ? "Creating account..." : "Create Account"}
      </Button>

      {hasGoogle && (
        <>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
            disabled={loading}
          >
            Continue with Google
          </Button>
        </>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/ src/app/signup/
git commit -m "feat: add login and signup pages with better-auth"
```

---

### Task 14: Delete Old Supabase Files

**Files:**
- Delete: `src/lib/supabase/client.ts`
- Delete: `src/lib/supabase/server.ts`
- Delete: `src/app/api/dev-login/route.ts`
- Delete: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Remove old files**

```bash
rm -rf src/lib/supabase/
rm src/app/api/dev-login/route.ts
rm -rf src/app/auth/
```

- [ ] **Step 2: Commit**

```bash
git rm -r src/lib/supabase/ src/app/api/dev-login/ src/app/auth/
git commit -m "chore: remove Supabase auth files"
```

---

### Task 15: Dev Seed Script

**Files:**
- Create: `src/lib/db/seed.ts`

- [ ] **Step 1: Create seed script**

Create `src/lib/db/seed.ts`:

```typescript
import { db } from "./index";
import { sql } from "drizzle-orm";
import { auth } from "../auth";

async function seed() {
  const accounts = [
    { name: "Admin User", email: "admin@test.com", password: "password123", role: "admin" },
    { name: "Test User", email: "user@test.com", password: "password123", role: "user" },
  ];

  for (const account of accounts) {
    const existing = await auth.api.signInEmail({
      body: { email: account.email, password: account.password },
    }).catch(() => null);

    if (existing) {
      console.log(`  ✓ ${account.email} already exists`);
      continue;
    }

    const { user, error } = await auth.api.signUpEmail({
      body: {
        name: account.name,
        email: account.email,
        password: account.password,
      },
    }).catch((e: any) => ({ user: null, error: e }));

    if (error) {
      console.log(`  ✗ Failed to create ${account.email}:`, error);
      continue;
    }

    // Set role directly in DB via parameterized query
    if (user && account.role === "admin") {
      await db.execute(
        sql`UPDATE "user" SET role = 'admin' WHERE id = ${user.id}`
      );
    }

    console.log(`  ✓ Created ${account.email} (${account.role})`);
  }

  console.log("\nDone!");
  process.exit(0);
}

seed();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/seed.ts
git commit -m "feat: add dev seed script for test accounts"
```

---

### Task 16: Build Verification & Cleanup

- [ ] **Step 1: Verify full build**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds with all routes.

- [ ] **Step 2: Push Drizzle schema and seed**

```bash
npx drizzle-kit push
npx tsx src/lib/db/seed.ts
```

- [ ] **Step 3: Start dev server and test**

Run: `npm run dev`

Verify:
1. Home page loads with stories
2. `/explore` shows story grid
3. `/login` shows email/password form + dev accounts panel
4. Click "Admin" dev account → signs in → redirected to `/`
5. `/admin` is accessible (admin role)
6. `/signup` creates a new account
7. `/library` shows user's stories (after reading one)
8. Story reader saves progress (check via `/library`)
9. Sign out works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete better-auth + Drizzle migration"
```
