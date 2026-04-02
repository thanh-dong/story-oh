# Children Profiles & Family Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add children profiles so parents can set up personalized learning for each child, with a family dashboard, story assignment, per-child progress tracking, and kid mode.

**Architecture:** New `children` and `child_stories` tables in Drizzle schema, REST API routes under `/api/children`, parent dashboard at `/dashboard` alongside existing `/library`, kid-mode layout with isolated chrome under `/dashboard/[childId]`, share dialog on story cards for assigning stories to children.

**Tech Stack:** Next.js 16 (app router), Drizzle ORM + PostgreSQL, Better-Auth, Tailwind CSS 4, shadcn/ui, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-02-children-profiles-implementation.md`

**No test framework** — this project has no unit test setup. Each task includes manual verification steps (dev server, curl, browser).

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/lib/db/schema.ts` (modify) | Add `children`, `childStories` tables; modify `userStories` PK |
| `src/lib/types.ts` (modify) | Add `Child`, `ChildStory` types |
| `src/lib/children.ts` | Ownership verification helper |
| `src/app/api/children/route.ts` | GET list / POST create child |
| `src/app/api/children/[id]/route.ts` | GET / PUT / DELETE single child |
| `src/app/api/children/[id]/stories/route.ts` | GET assigned / POST assign story |
| `src/app/api/children/[id]/stories/[storyId]/route.ts` | DELETE unassign story |
| `src/app/dashboard/page.tsx` | Parent dashboard — children card grid |
| `src/app/dashboard/new/page.tsx` | Add child form |
| `src/app/dashboard/[childId]/layout.tsx` | Kid-mode layout (no navbar/footer) |
| `src/app/dashboard/[childId]/page.tsx` | Child's learning hub |
| `src/app/dashboard/[childId]/edit/page.tsx` | Edit child form |
| `src/app/dashboard/[childId]/read/[storyId]/page.tsx` | Story reader in kid mode |
| `src/components/share-story-dialog.tsx` | Dialog to assign stories to children |
| `src/components/child-card.tsx` | Child profile card for dashboard grid |
| `src/components/child-form.tsx` | Reusable form for add/edit child |
| `src/components/hold-to-exit-button.tsx` | Press-and-hold back button for kid mode |

### Modified files

| File | Change |
|------|--------|
| `src/components/story-card.tsx` | Add share button prop |
| `src/components/navbar.tsx` | Add Dashboard link when user has children |
| `src/app/explore/page.tsx` | Pass children list to story cards |
| `src/app/library/page.tsx` | Pass children list to story cards |
| `src/app/api/stories/[id]/progress/route.ts` | Accept optional `childId` |
| `src/components/story-reader.tsx` | Accept optional `childId` prop, pass to progress save |
| `src/app/story/[id]/read/page.tsx` | Filter progress for parent-only rows (exclude child_id) |
| `src/app/globals.css` | Add kid-mode CSS (hide navbar/footer, young child touch targets) |
| `src/middleware.ts` | Add `/dashboard` to protected routes |

---

## Task 1: Database Schema — New Tables

**Files:**
- Modify: `src/lib/db/schema.ts:1-110`

- [ ] **Step 1: Add `children` table to schema**

Add after the `stories` table definition (after line 76) in `src/lib/db/schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  index,
  date,
} from "drizzle-orm/pg-core";
```

Then add the table:

```typescript
// ─── Children & Family Tables ───

export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: text("parent_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  avatar: text("avatar").notNull(),
  nativeLanguage: text("native_language").notNull().default("en"),
  learningLanguages: jsonb("learning_languages")
    .$type<string[]>()
    .notNull()
    .default(["en"]),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  dailyGoalMinutes: integer("daily_goal_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const childStories = pgTable(
  "child_stories",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" })
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.childId, table.storyId] })]
);
```

- [ ] **Step 2: Modify `userStories` — add surrogate PK and `childId`**

Replace the existing `userStories` definition (lines 78-91) with:

```typescript
export const userStories = pgTable(
  "user_stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    story_id: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    child_id: uuid("child_id").references(() => children.id),
    progress: jsonb("progress")
      .$type<{ current_node: string; history: string[] }>()
      .default({ current_node: "start", history: ["start"] }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
  },
  (table) => [
    index("user_stories_user_story_idx").on(table.user_id, table.story_id),
    index("user_stories_user_story_child_idx").on(table.user_id, table.story_id, table.child_id),
  ]
);
```

Note: The composite PK `(user_id, story_id)` is replaced with a surrogate `id` UUID PK. An index on `(user_id, story_id, child_id)` provides query performance. Uniqueness is enforced at the application level in the progress route (query before insert with `isNull` handling for null `child_id`). The `child_id` column enables per-child progress.

- [ ] **Step 3: Push schema to database**

Run: `npm run db:push`

Expected: Schema changes applied. The `children` and `child_stories` tables are created. The `user_stories` table is modified (this may require confirming destructive changes if data exists).

- [ ] **Step 4: Verify schema in Drizzle Studio**

Run: `npm run db:studio`

Expected: Open studio URL, verify `children`, `child_stories` tables exist, `user_stories` has `id`, `child_id` columns.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(db): add children and child_stories tables, modify user_stories PK"
```

---

## Task 2: Types

**Files:**
- Modify: `src/lib/types.ts:29-37`

- [ ] **Step 1: Add Child and ChildStory types**

Add to the end of `src/lib/types.ts`:

```typescript
export interface Child {
  id: string;
  parentId: string;
  name: string;
  dateOfBirth: string;
  avatar: string;
  nativeLanguage: string;
  learningLanguages: string[];
  interests: string[];
  dailyGoalMinutes: number | null;
  createdAt: string;
}

export interface ChildWithStats extends Child {
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
}
```

- [ ] **Step 2: Update UserStory type to include optional childId**

In `src/lib/types.ts`, update the `UserStory` interface (lines 29-37) — add `child_id`:

```typescript
export interface UserStory {
  id: string;
  user_id: string;
  story_id: string;
  child_id: string | null;
  progress: {
    current_node: string;
    history: string[];
  };
  story?: Story;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No type errors (some pre-existing errors from the `userStories` PK change may appear — fix any references to the old composite PK pattern in existing code).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add Child and ChildWithStats types, update UserStory"
```

---

## Task 3: Fix Existing Code for New `userStories` Schema

The `userStories` table PK changed from composite `(user_id, story_id)` to surrogate `id`. Existing code that queries or inserts into `userStories` needs updating to handle the new `child_id` column — specifically, parent progress must filter for `isNull(child_id)` to avoid returning a child's progress row.

**Files:**
- Modify: `src/app/story/[id]/read/page.tsx:36-53`
- Modify: `src/app/library/page.tsx:25-34`

- [ ] **Step 1: Update story read page to filter for parent-only progress**

In `src/app/story/[id]/read/page.tsx`, the progress query (lines 36-44) and insert (lines 49-52) need to handle `child_id`. Update the query to filter for `isNull(userStories.child_id)` so it only returns the parent's own progress, not a child's:

Add `isNull` to the import from `drizzle-orm` (line 5):

```typescript
import { and, eq, isNull } from "drizzle-orm";
```

Replace the progress query and insert block (lines 36-53):

```typescript
    const [existing] = await db
      .select()
      .from(userStories)
      .where(
        and(
          eq(userStories.user_id, session.user.id),
          eq(userStories.story_id, id),
          isNull(userStories.child_id)
        )
      );

    if (existing) {
      progress = existing.progress ?? progress;
    } else {
      await db.insert(userStories).values({
        user_id: session.user.id,
        story_id: id,
        child_id: null,
      });
    }
```

- [ ] **Step 2: Update library page reading progress query**

In `src/app/library/page.tsx`, the reading progress query (lines 25-29) should also filter for parent-only progress. Add `isNull` to imports and update the where clause:

```typescript
import { eq, isNull, and } from "drizzle-orm";
```

Update the query (lines 25-29):

```typescript
  const rows = await db
    .select()
    .from(userStories)
    .innerJoin(storiesTable, eq(userStories.story_id, storiesTable.id))
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        isNull(userStories.child_id)
      )
    );
```

- [ ] **Step 3: Verify both pages work**

Run: `npm run dev`
- Navigate to `/story/STORY_ID/read` — verify progress loads and saves correctly
- Navigate to `/library` — verify reading progress section shows only parent's own progress

Expected: Both pages work as before, now correctly scoped to parent-only progress.

- [ ] **Step 4: Commit**

```bash
git add src/app/story/\[id\]/read/page.tsx src/app/library/page.tsx
git commit -m "fix: scope progress queries to parent-only rows (exclude child_id)"
```

---

## Task 4: Children Ownership Helper

**Files:**
- Create: `src/lib/children.ts`

- [ ] **Step 1: Create ownership verification helper**

Create `src/lib/children.ts`:

```typescript
import { db } from "@/lib/db";
import { children } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function verifyChildOwnership(childId: string, userId: string) {
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.parentId, userId)));
  return child ?? null;
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/children.ts
git commit -m "feat: add child ownership verification helper"
```

---

## Task 5: Children CRUD API Routes

**Files:**
- Create: `src/app/api/children/route.ts`
- Create: `src/app/api/children/[id]/route.ts`

- [ ] **Step 1: Create GET/POST for `/api/children`**

Create `src/app/api/children/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.user.id));

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name || !body.dateOfBirth || !body.avatar) {
    return NextResponse.json(
      { error: "name, dateOfBirth, and avatar are required" },
      { status: 400 }
    );
  }

  const [child] = await db
    .insert(children)
    .values({
      parentId: session.user.id,
      name: body.name,
      dateOfBirth: body.dateOfBirth,
      avatar: body.avatar,
      nativeLanguage: body.nativeLanguage ?? "en",
      learningLanguages: body.learningLanguages ?? ["en"],
      interests: body.interests ?? [],
      dailyGoalMinutes: body.dailyGoalMinutes ?? null,
    })
    .returning();

  return NextResponse.json(child, { status: 201 });
}
```

- [ ] **Step 2: Create GET/PUT/DELETE for `/api/children/[id]`**

Create `src/app/api/children/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(child);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const [updated] = await db
    .update(children)
    .set({
      name: body.name ?? child.name,
      dateOfBirth: body.dateOfBirth ?? child.dateOfBirth,
      avatar: body.avatar ?? child.avatar,
      nativeLanguage: body.nativeLanguage ?? child.nativeLanguage,
      learningLanguages: body.learningLanguages ?? child.learningLanguages,
      interests: body.interests ?? child.interests,
      dailyGoalMinutes: body.dailyGoalMinutes !== undefined ? body.dailyGoalMinutes : child.dailyGoalMinutes,
    })
    .where(eq(children.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(children).where(eq(children.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify with curl**

Start dev server: `npm run dev`

```bash
# Create a child (use a valid session cookie)
curl -X POST http://localhost:3000/api/children \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{"name":"Minh","dateOfBirth":"2021-03-15","avatar":"🦁"}'

# List children
curl http://localhost:3000/api/children \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

Expected: POST returns 201 with child object. GET returns array with the created child.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/children/
git commit -m "feat(api): add children CRUD endpoints"
```

---

## Task 6: Story Assignment API Routes

**Files:**
- Create: `src/app/api/children/[id]/stories/route.ts`
- Create: `src/app/api/children/[id]/stories/[storyId]/route.ts`

- [ ] **Step 1: Create GET/POST for `/api/children/[id]/stories`**

Create `src/app/api/children/[id]/stories/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(childStories)
    .innerJoin(stories, eq(childStories.storyId, stories.id))
    .leftJoin(
      userStories,
      and(
        eq(userStories.story_id, childStories.storyId),
        eq(userStories.user_id, session.user.id),
        eq(userStories.child_id, id)
      )
    )
    .where(eq(childStories.childId, id));

  const result = rows.map((row) => ({
    ...row.stories,
    assignedAt: row.child_stories.assignedAt,
    progress: row.user_stories?.progress ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.storyId) {
    return NextResponse.json({ error: "storyId is required" }, { status: 400 });
  }

  // Verify story exists
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, body.storyId));

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  await db
    .insert(childStories)
    .values({ childId: id, storyId: body.storyId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

- [ ] **Step 2: Create DELETE for `/api/children/[id]/stories/[storyId]`**

Create `src/app/api/children/[id]/stories/[storyId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; storyId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, storyId } = await params;
  const child = await verifyChildOwnership(id, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(childStories)
    .where(
      and(eq(childStories.childId, id), eq(childStories.storyId, storyId))
    );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify with curl**

```bash
# Assign a story to a child (use real IDs from previous step)
curl -X POST http://localhost:3000/api/children/CHILD_ID/stories \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -d '{"storyId":"STORY_UUID"}'

# List assigned stories
curl http://localhost:3000/api/children/CHILD_ID/stories \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"
```

Expected: POST returns 201. GET returns array with story + progress.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/children/
git commit -m "feat(api): add story assignment endpoints for children"
```

---

## Task 7: Modify Progress Tracking for Per-Child Support

**Files:**
- Modify: `src/app/api/stories/[id]/progress/route.ts:1-52`
- Modify: `src/components/story-reader.tsx:10-14,38-48`

- [ ] **Step 1: Update progress API to accept `childId`**

In `src/app/api/stories/[id]/progress/route.ts`, update the POST handler to accept an optional `childId` in the body. When present, query and upsert with `child_id`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userStories } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

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
  const childId: string | null = body.childId ?? null;

  // Build the where clause — handle null childId with isNull
  const whereClause = childId
    ? and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId),
        eq(userStories.child_id, childId)
      )
    : and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId),
        isNull(userStories.child_id)
      );

  const [existing] = await db
    .select()
    .from(userStories)
    .where(whereClause);

  if (existing) {
    await db
      .update(userStories)
      .set({ progress })
      .where(eq(userStories.id, existing.id));
  } else {
    await db.insert(userStories).values({
      user_id: session.user.id,
      story_id: storyId,
      child_id: childId,
      progress,
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Update StoryReader props to accept `childId`**

In `src/components/story-reader.tsx`, update the props interface (lines 10-14):

```typescript
interface StoryReaderProps {
  story: Story;
  initialProgress: { current_node: string; history: string[] };
  userId: string | null;
  childId?: string | null;
}
```

Update the component destructuring (line 24-28):

```typescript
export function StoryReader({
  story,
  initialProgress,
  userId,
  childId,
}: StoryReaderProps) {
```

Update `saveProgress` (lines 38-48) to include `childId`:

```typescript
const saveProgress = useCallback(
  async (nodeId: string, newHistory: string[]) => {
    if (!userId) return;
    fetch(`/api/stories/${story.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_node: nodeId,
        history: newHistory,
        childId: childId ?? undefined,
      }),
    }).catch(() => {});
  },
  [story.id, userId, childId]
);
```

- [ ] **Step 3: Verify existing reading still works**

Run: `npm run dev` — navigate to a story and make choices.

Expected: Progress saves correctly (no `childId` means parent's own progress, same as before).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stories/[id]/progress/route.ts src/components/story-reader.tsx
git commit -m "feat: support per-child progress tracking in story reader"
```

---

## Task 8: Middleware — Protect Dashboard Routes

**Files:**
- Modify: `src/middleware.ts:20-22`

- [ ] **Step 1: Add `/dashboard` to protected routes**

In `src/middleware.ts`, update the matcher config (line 20-22):

```typescript
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*"],
};
```

- [ ] **Step 2: Verify redirect works**

Open `http://localhost:3000/dashboard` while logged out.

Expected: Redirects to `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: protect /dashboard routes with auth middleware"
```

---

## Task 9: Child Form Component

**Files:**
- Create: `src/components/child-form.tsx`

- [ ] **Step 1: Create reusable child form component**

Create `src/components/child-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AVATAR_OPTIONS = [
  "🦁", "🐨", "🦊", "🐰", "🐻", "🦋", "🐬", "🦄",
  "🐸", "🐧", "🦉", "🐝", "🐢", "🦜", "🐙", "🦈",
  "🌺", "🌈", "⭐", "🍄",
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "de", label: "Deutsch" },
];

const INTEREST_PRESETS = [
  "animals", "space", "dinosaurs", "ocean", "cooking",
  "sports", "music", "fairy tales", "robots", "nature",
  "friendship", "adventure",
];

const DAILY_GOAL_OPTIONS = [
  { value: null, label: "No goal" },
  { value: 10, label: "10 min/day" },
  { value: 15, label: "15 min/day" },
  { value: 20, label: "20 min/day" },
  { value: 30, label: "30 min/day" },
];

interface ChildFormProps {
  initialData?: {
    name: string;
    dateOfBirth: string;
    avatar: string;
    nativeLanguage: string;
    learningLanguages: string[];
    interests: string[];
    dailyGoalMinutes: number | null;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
}

export function ChildForm({ initialData, onSubmit, submitLabel }: ChildFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialData?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth ?? "");
  const [avatar, setAvatar] = useState(
    initialData?.avatar ?? AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]
  );
  const [nativeLanguage, setNativeLanguage] = useState(initialData?.nativeLanguage ?? "en");
  const [learningLanguages, setLearningLanguages] = useState<string[]>(
    initialData?.learningLanguages ?? ["en"]
  );
  const [interests, setInterests] = useState<string[]>(initialData?.interests ?? []);
  const [customInterest, setCustomInterest] = useState("");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number | null>(
    initialData?.dailyGoalMinutes ?? null
  );

  function toggleLearningLang(lang: string) {
    setLearningLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  function addCustomInterest() {
    const trimmed = customInterest.trim().toLowerCase();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed]);
    }
    setCustomInterest("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        dateOfBirth,
        avatar,
        nativeLanguage,
        learningLanguages,
        interests,
        dailyGoalMinutes,
      });
      router.push("/dashboard");
    } catch {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-8">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Child&apos;s name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          required
          className="rounded-xl"
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob">Date of birth</Label>
        <Input
          id="dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>

      {/* Avatar picker */}
      <div className="space-y-2">
        <Label>Avatar</Label>
        <div className="grid grid-cols-10 gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              className={`flex size-10 items-center justify-center rounded-xl text-xl transition-all ${
                avatar === emoji
                  ? "bg-primary/20 ring-2 ring-primary scale-110"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Native language */}
      <div className="space-y-2">
        <Label htmlFor="native-lang">Native language</Label>
        <select
          id="native-lang"
          value={nativeLanguage}
          onChange={(e) => setNativeLanguage(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Learning languages */}
      <div className="space-y-2">
        <Label>Learning languages</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => toggleLearningLang(lang.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                learningLanguages.includes(lang.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label>Interests</Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_PRESETS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-all ${
                interests.includes(interest)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {interest}
            </button>
          ))}
          {interests
            .filter((i) => !INTEREST_PRESETS.includes(i))
            .map((custom) => (
              <button
                key={custom}
                type="button"
                onClick={() => toggleInterest(custom)}
                className="rounded-full bg-primary px-3 py-1 text-sm font-medium capitalize text-primary-foreground"
              >
                {custom} ×
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            placeholder="Add custom interest..."
            className="rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomInterest();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustomInterest}
            className="rounded-xl"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Daily goal */}
      <div className="space-y-2">
        <Label>Daily reading goal</Label>
        <div className="flex flex-wrap gap-2">
          {DAILY_GOAL_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setDailyGoalMinutes(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                dailyGoalMinutes === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl"
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || !name || !dateOfBirth}
          className="flex-1 rounded-xl font-bold"
        >
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/child-form.tsx
git commit -m "feat: add reusable child profile form component"
```

---

## Task 10: Add Child Page

**Files:**
- Create: `src/app/dashboard/new/page.tsx`

- [ ] **Step 1: Create the add child page**

Create `src/app/dashboard/new/page.tsx`:

```typescript
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChildForm } from "@/components/child-form";

export default function NewChildPage() {
  async function handleCreate(data: Record<string, unknown>) {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create child");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 animate-fade-up">
        <Button
          variant="ghost"
          size="lg"
          className="min-h-[44px] rounded-xl"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-5" data-icon="inline-start" />
          Back
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Add Child
        </h1>
      </div>

      <ChildForm onSubmit={handleCreate} submitLabel="Add Child" />
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/dashboard/new` while logged in.

Expected: Form renders with all fields. Submitting creates a child and redirects to `/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/new/
git commit -m "feat: add child profile creation page"
```

---

## Task 11: Child Card Component

**Files:**
- Create: `src/components/child-card.tsx`

- [ ] **Step 1: Create child card component**

Create `src/components/child-card.tsx`:

```typescript
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ChildCardProps {
  id: string;
  name: string;
  avatar: string;
  age: number;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
}

export function ChildCard({
  id,
  name,
  avatar,
  age,
  assignedCount,
  completedCount,
  inProgressCount,
}: ChildCardProps) {
  return (
    <Link href={`/dashboard/${id}`} className="group block">
      <article className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
        <span className="text-5xl transition-transform duration-300 group-hover:scale-110">
          {avatar}
        </span>
        <div className="text-center">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm text-muted-foreground">Age {age}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {assignedCount} {assignedCount === 1 ? "story" : "stories"}
          </Badge>
          {completedCount > 0 && (
            <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
              {completedCount} done
            </Badge>
          )}
          {inProgressCount > 0 && (
            <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
              {inProgressCount} reading
            </Badge>
          )}
        </div>
      </article>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/child-card.tsx
git commit -m "feat: add child profile card component"
```

---

## Task 12: Parent Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create the parent dashboard page**

Create `src/app/dashboard/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children, childStories, userStories } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChildCard } from "@/components/child-card";
import { calculateAge } from "@/lib/children";
import type { StoryTree } from "@/lib/types";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const childrenList = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.user.id));

  // Get stats for each child
  const childrenWithStats = await Promise.all(
    childrenList.map(async (child) => {
      const assigned = await db
        .select({ count: sql<number>`count(*)` })
        .from(childStories)
        .where(eq(childStories.childId, child.id));

      // Fetch progress rows with story data to determine completion
      const progressRows = await db
        .select()
        .from(userStories)
        .innerJoin(stories, eq(userStories.story_id, stories.id))
        .where(
          and(
            eq(userStories.user_id, session.user.id),
            eq(userStories.child_id, child.id)
          )
        );

      let completedCount = 0;
      let inProgressCount = 0;
      for (const row of progressRows) {
        const currentNode = row.user_stories.progress?.current_node ?? "start";
        const storyTree = row.stories.story_tree as StoryTree;
        const node = storyTree[currentNode];
        if (node && node.choices.length === 0) {
          completedCount++;
        } else {
          inProgressCount++;
        }
      }

      return {
        ...child,
        age: calculateAge(child.dateOfBirth),
        assignedCount: Number(assigned[0]?.count ?? 0),
        completedCount,
        inProgressCount,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Family Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your children&apos;s learning
        </p>
      </div>

      {childrenWithStats.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {childrenWithStats.map((child) => (
            <ChildCard
              key={child.id}
              id={child.id}
              name={child.name}
              avatar={child.avatar}
              age={child.age}
              assignedCount={child.assignedCount}
              completedCount={child.completedCount}
              inProgressCount={child.inProgressCount}
            />
          ))}

          {/* Add child card */}
          <Link href="/dashboard/new" className="group block">
            <article className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/25 p-6 transition-all duration-300 hover:border-primary/50 hover:bg-muted/30">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Plus className="size-7" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary">
                Add Child
              </span>
            </article>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">👨‍👩‍👧‍👦</span>
          <div className="space-y-2">
            <p className="text-xl font-bold">Set up your family</p>
            <p className="text-muted-foreground">
              Add your children to create personalized learning experiences
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button size="lg" className="rounded-full px-8 text-lg font-bold">
              <Plus className="size-5" data-icon="inline-start" />
              Add Your First Child
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/dashboard` while logged in.

Expected: Shows empty state if no children, or card grid with children profiles.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add parent family dashboard page"
```

---

## Task 13: Kid Mode Layout

**Files:**
- Create: `src/app/dashboard/[childId]/layout.tsx`
- Create: `src/components/hold-to-exit-button.tsx`

- [ ] **Step 1: Create hold-to-exit button component**

Create `src/components/hold-to-exit-button.tsx`:

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function HoldToExitButton() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const HOLD_DURATION = 2000; // 2 seconds
  const UPDATE_INTERVAL = 30; // ~33fps

  const handlePointerDown = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        router.push("/dashboard");
      }
    }, UPDATE_INTERVAL);
  }, [router]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
  }, []);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/80 select-none touch-none"
    >
      {/* Progress ring */}
      <svg className="absolute -inset-0.5 size-[calc(100%+4px)]" viewBox="0 0 100 36">
        <rect
          x="1"
          y="1"
          width="98"
          height="34"
          rx="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress * 264} 264`}
          className="text-primary transition-none"
        />
      </svg>
      ← Hold to exit
    </button>
  );
}
```

- [ ] **Step 2: Create kid mode layout**

**Important:** This layout nests inside the root layout (`src/app/layout.tsx`), which renders `<Navbar />` and `<footer>`. The kid-mode layout uses CSS to hide those elements, giving a clean kid-mode experience without restructuring the route tree.

Create `src/app/dashboard/[childId]/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { verifyChildOwnership } from "@/lib/children";
import { calculateAge } from "@/lib/children";
import { HoldToExitButton } from "@/components/hold-to-exit-button";

export default async function KidModeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const age = calculateAge(child.dateOfBirth);
  const isYoung = age < 6;

  return (
    <div className={`kid-mode ${isYoung ? "kid-young" : ""}`}>
      {/* Minimal kid-mode header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{child.avatar}</span>
          <span className="text-lg font-bold">{child.name}</span>
        </div>
        <HoldToExitButton />
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add kid-mode CSS styles**

Add to `src/app/globals.css` (or wherever global styles live):

```css
/* Kid mode — hide navbar and footer when inside kid-mode layout */
.kid-mode ~ nav,
body:has(.kid-mode) > nav,
body:has(.kid-mode) > footer,
body:has(.kid-mode) > main > nav {
  display: none !important;
}

/* Also hide the root layout's navbar (it's a sibling in the DOM) */
body:has(.kid-mode) > :first-child {
  /* The Navbar is the first child of body */
}

/* More reliable: target by component structure */
/* The root layout renders: nav.sticky > main > footer */
/* When .kid-mode is present anywhere in the tree, hide nav and footer */
:has(.kid-mode) > nav[class*="sticky"],
:has(.kid-mode) > footer {
  display: none !important;
}

/* Also remove the root layout's max-width/padding wrapper since kid layout handles its own */
:has(.kid-mode) > main > div[class*="max-w"] {
  max-width: none;
  padding: 0;
}

/* Kid mode — large touch targets for young children (age < 6) */
.kid-young button,
.kid-young a {
  min-height: 64px;
  min-width: 64px;
}

.kid-young p,
.kid-young span {
  font-size: 1.125rem;
}
```

Note: The `:has()` CSS selector is supported in all modern browsers. This approach avoids modifying the root layout component.

- [ ] **Step 4: Verify in browser**

Create a child first, then navigate to `http://localhost:3000/dashboard/CHILD_ID`.

Expected: Kid-mode layout shows — no navbar, no footer, child avatar + name, hold-to-exit button. Hold the exit button for 2 seconds to navigate back to dashboard.

- [ ] **Step 5: Commit**

```bash
git add src/components/hold-to-exit-button.tsx src/app/dashboard/\[childId\]/layout.tsx
git commit -m "feat: add kid mode layout with hold-to-exit button"
```

---

## Task 14: Child's Learning Hub

**Files:**
- Create: `src/app/dashboard/[childId]/page.tsx`

- [ ] **Step 1: Create the child's learning hub page**

Create `src/app/dashboard/[childId]/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story, StoryTree } from "@/lib/types";
import { Pencil } from "lucide-react";

function isAtEnding(storyTree: StoryTree, currentNode: string): boolean {
  const node = storyTree[currentNode];
  return node ? node.choices.length === 0 : false;
}

export default async function ChildHubPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const age = calculateAge(child.dateOfBirth);

  // Fetch assigned stories with progress
  const rows = await db
    .select()
    .from(childStories)
    .innerJoin(stories, eq(childStories.storyId, stories.id))
    .leftJoin(
      userStories,
      and(
        eq(userStories.story_id, childStories.storyId),
        eq(userStories.user_id, session.user.id),
        eq(userStories.child_id, childId)
      )
    )
    .where(eq(childStories.childId, childId));

  const assignedStories = rows.map((row) => ({
    story: row.stories as Story,
    progress: row.user_stories?.progress ?? null,
  }));

  const notStarted = assignedStories.filter((s) => !s.progress);
  const inProgress = assignedStories.filter(
    (s) => s.progress && !isAtEnding(s.story.story_tree, s.progress.current_node)
  );
  const completed = assignedStories.filter(
    (s) => s.progress && isAtEnding(s.story.story_tree, s.progress.current_node)
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{child.avatar}</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hi {child.name}!
            </h1>
            <Badge variant="secondary" className="mt-1">Age {age}</Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="lg"
          className="min-h-[44px] rounded-xl"
          render={<Link href={`/dashboard/${childId}/edit`} />}
        >
          <Pencil className="size-4" data-icon="inline-start" />
          Edit
        </Button>
      </div>

      {assignedStories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
          <span className="text-6xl" aria-hidden="true">📚</span>
          <p className="text-xl font-bold">No stories yet!</p>
          <p className="text-muted-foreground">
            Ask your parent to pick some stories for you.
          </p>
          <Link href="/explore">
            <Button variant="outline" className="rounded-full px-6 font-bold">
              Explore Stories
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* In Progress */}
          {inProgress.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Continue Reading</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {inProgress.map(({ story, progress }) => {
                  const gradient = getGradient(story.title);
                  const emoji = getStoryEmoji(story.title);
                  return (
                    <Link
                      key={story.id}
                      href={`/dashboard/${childId}/read/${story.id}`}
                      className="group block"
                    >
                      <article className="relative overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                        <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                          <span className="text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold">{story.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {progress!.history.length - 1} choices made
                          </p>
                          <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
                            Continue
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Not Started */}
          {notStarted.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Your Stories</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {notStarted.map(({ story }) => {
                  const gradient = getGradient(story.title);
                  const emoji = getStoryEmoji(story.title);
                  return (
                    <Link
                      key={story.id}
                      href={`/dashboard/${childId}/read/${story.id}`}
                      className="group block"
                    >
                      <article className="overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                        <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                          <span className="text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold">{story.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{story.summary}</p>
                          <span className="mt-2 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">
                            Start Reading
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Completed ✓</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {completed.map(({ story }) => {
                  const gradient = getGradient(story.title);
                  const emoji = getStoryEmoji(story.title);
                  return (
                    <Link
                      key={story.id}
                      href={`/dashboard/${childId}/read/${story.id}`}
                      className="group block"
                    >
                      <article className="overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
                        <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                          <span className="text-4xl drop-shadow-md">{emoji}</span>
                          <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                            ✓ Done
                          </Badge>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold">{story.title}</h3>
                          <span className="mt-2 inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-bold text-muted-foreground">
                            Read Again
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/dashboard/CHILD_ID` (with a child that has assigned stories).

Expected: Shows sections for in-progress, not-started, and completed stories. Empty state shows if no stories assigned.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/\[childId\]/page.tsx
git commit -m "feat: add child's learning hub page"
```

---

## Task 15: Edit Child Page

**Files:**
- Create: `src/app/dashboard/[childId]/edit/page.tsx`

- [ ] **Step 1: Create the edit child page**

Create `src/app/dashboard/[childId]/edit/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChildForm } from "@/components/child-form";
import type { Child } from "@/lib/types";

export default function EditChildPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/children/${childId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setChild)
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [childId, router]);

  async function handleUpdate(data: Record<string, unknown>) {
    const res = await fetch(`/api/children/${childId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!child) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 animate-fade-up">
        <Button
          variant="ghost"
          size="lg"
          className="min-h-[44px] rounded-xl"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-5" data-icon="inline-start" />
          Back
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Edit {child.name}
        </h1>
      </div>

      <ChildForm
        initialData={{
          name: child.name,
          dateOfBirth: child.dateOfBirth,
          avatar: child.avatar,
          nativeLanguage: child.nativeLanguage,
          learningLanguages: child.learningLanguages,
          interests: child.interests,
          dailyGoalMinutes: child.dailyGoalMinutes,
        }}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/dashboard/CHILD_ID/edit`.

Expected: Form pre-filled with child's data. Saving updates and redirects to dashboard.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/\[childId\]/edit/
git commit -m "feat: add edit child profile page"
```

---

## Task 16: Kid Mode Story Reader

**Files:**
- Create: `src/app/dashboard/[childId]/read/[storyId]/page.tsx`

- [ ] **Step 1: Create kid mode reader page**

Create `src/app/dashboard/[childId]/read/[storyId]/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { stories, userStories } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";
import { StoryReader } from "@/components/story-reader";
import type { Story } from "@/lib/types";

export default async function KidModeReaderPage({
  params,
}: {
  params: Promise<{ childId: string; storyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId, storyId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  // Fetch the story
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId));

  if (!story) redirect(`/dashboard/${childId}`);

  // Fetch child-specific progress
  const [progress] = await db
    .select()
    .from(userStories)
    .where(
      and(
        eq(userStories.user_id, session.user.id),
        eq(userStories.story_id, storyId),
        eq(userStories.child_id, childId)
      )
    );

  const initialProgress = progress?.progress ?? {
    current_node: "start",
    history: ["start"],
  };

  return (
    <StoryReader
      story={story as Story}
      initialProgress={initialProgress}
      userId={session.user.id}
      childId={childId}
    />
  );
}
```

- [ ] **Step 2: Verify in browser**

Assign a story to a child, then navigate to `http://localhost:3000/dashboard/CHILD_ID/read/STORY_ID`.

Expected: Story reader loads in kid mode (no navbar/footer). Making choices saves progress under the child's ID. Visiting the same story from `/story/ID/read` (normal mode) shows different progress.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/\[childId\]/read/
git commit -m "feat: add kid mode story reader with per-child progress"
```

---

## Task 17: Share Story Dialog

**Files:**
- Create: `src/components/share-story-dialog.tsx`

- [ ] **Step 1: Create the share dialog component**

Create `src/components/share-story-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import type { Child } from "@/lib/types";

interface ShareStoryDialogProps {
  storyId: string;
  children: Child[];
  assignedChildIds: string[];
}

export function ShareStoryDialog({
  storyId,
  children: childrenList,
  assignedChildIds: initialAssigned,
}: ShareStoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initialAssigned));
  const [saving, setSaving] = useState(false);

  function toggle(childId: string) {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const initial = new Set(initialAssigned);

    // Assign new
    const toAssign = [...assigned].filter((id) => !initial.has(id));
    // Unassign removed
    const toUnassign = [...initial].filter((id) => !assigned.has(id));

    await Promise.all([
      ...toAssign.map((childId) =>
        fetch(`/api/children/${childId}/stories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId }),
        })
      ),
      ...toUnassign.map((childId) =>
        fetch(`/api/children/${childId}/stories/${storyId}`, {
          method: "DELETE",
        })
      ),
    ]);

    setSaving(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            className="flex size-8 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            aria-label="Share with children"
          />
        }
      >
        <Users className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with Children</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
          {childrenList.map((child) => (
            <button
              key={child.id}
              onClick={() => toggle(child.id)}
              className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all ${
                assigned.has(child.id)
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <span className="text-3xl">{child.avatar}</span>
              <span className="text-sm font-semibold">{child.name}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/share-story-dialog.tsx
git commit -m "feat: add share story with children dialog component"
```

---

## Task 18: Integrate Share Button into Story Cards

**Files:**
- Modify: `src/components/story-card.tsx:1-45`
- Modify: `src/app/explore/page.tsx:1-37`
- Modify: `src/app/library/page.tsx:1-182`

- [ ] **Step 1: Update StoryCard to accept share props**

Update `src/components/story-card.tsx` to accept optional children list and assignment data. The share button overlays the gradient cover:

```typescript
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story, Child } from "@/lib/types";
import { ShareStoryDialog } from "@/components/share-story-dialog";

interface StoryCardProps {
  story: Story;
  childrenList?: Child[];
  assignedChildIds?: string[];
}

export function StoryCard({ story, childrenList, assignedChildIds }: StoryCardProps) {
  const gradient = getGradient(story.title);
  const nodeCount = Object.keys(story.story_tree).length;
  const endingCount = Object.values(story.story_tree).filter(
    (n) => n.choices.length === 0
  ).length;

  return (
    <article className="relative h-full overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-1 hover:storybook-shadow-lg">
      <Link href={`/story/${story.id}`} className="group block">
        {/* Gradient cover */}
        <div
          className={`relative h-40 w-full bg-gradient-to-br ${gradient} flex items-center justify-center sm:h-44`}
        >
          <span className="text-5xl drop-shadow-md transition-transform duration-300 group-hover:scale-110 sm:text-6xl" aria-hidden="true">
            {getStoryEmoji(story.title)}
          </span>
          <Badge className="absolute right-3 top-3 bg-white/25 text-white backdrop-blur-sm border-0 text-xs font-bold">
            {story.age_range}
          </Badge>
        </div>

        {/* Content */}
        <div className="space-y-2 p-4 sm:p-5">
          <h3 className="text-lg font-bold leading-snug tracking-tight">
            {story.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {story.summary}
          </p>
          <div className="flex items-center gap-3 pt-1 text-xs font-medium text-muted-foreground/70">
            <span>{nodeCount} pages</span>
            <span aria-hidden="true">&middot;</span>
            <span>{endingCount} {endingCount === 1 ? "ending" : "endings"}</span>
          </div>
        </div>
      </Link>

      {/* Share button — only shown when user has children */}
      {childrenList && childrenList.length > 0 && (
        <div className="absolute left-3 top-3 z-10">
          <ShareStoryDialog
            storyId={story.id}
            children={childrenList}
            assignedChildIds={assignedChildIds ?? []}
          />
        </div>
      )}
    </article>
  );
}
```

Note: The outer `<Link>` is moved inside the article so the share button can sit outside the link without nested `<a>` tags.

- [ ] **Step 2: Update explore page to pass children**

Update `src/app/explore/page.tsx` to fetch the user's children and pass them to story cards:

```typescript
import { db } from "@/lib/db";
import { stories as storiesTable, children, childStories } from "@/lib/db/schema";
import { isNull, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { StoryCard } from "@/components/story-card";
import type { Child } from "@/lib/types";

export default async function ExplorePage() {
  const storyList = await db.select().from(storiesTable).where(isNull(storiesTable.created_by));
  const session = await getSession();

  let childrenList: Child[] = [];
  let assignmentMap: Record<string, string[]> = {};

  if (session) {
    const rawChildren = await db
      .select()
      .from(children)
      .where(eq(children.parentId, session.user.id));
    childrenList = rawChildren as Child[];

    if (childrenList.length > 0) {
      const assignments = await db
        .select()
        .from(childStories)
        .where(
          inArray(
            childStories.childId,
            childrenList.map((c) => c.id)
          )
        );

      // Build map: storyId -> [childIds]
      for (const a of assignments) {
        if (!assignmentMap[a.storyId]) assignmentMap[a.storyId] = [];
        assignmentMap[a.storyId].push(a.childId);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Explore Stories
        </h1>
        <p className="mt-2 text-muted-foreground">
          {storyList.length} {storyList.length === 1 ? "adventure" : "adventures"} waiting for you
        </p>
      </div>

      {storyList.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {storyList.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              childrenList={childrenList}
              assignedChildIds={assignmentMap[story.id] ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DA;</span>
          <p className="text-lg font-semibold">No stories yet</p>
          <p className="text-muted-foreground">
            New adventures are being written. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update library page to include share buttons**

In `src/app/library/page.tsx`, add children fetching and share dialog integration. The library uses custom inline card markup (not `StoryCard`), so add the `ShareStoryDialog` directly to each card.

Add imports at the top:

```typescript
import { children as childrenTable, childStories } from "@/lib/db/schema";
import { inArray, and, isNull } from "drizzle-orm";
import { ShareStoryDialog } from "@/components/share-story-dialog";
import type { Child } from "@/lib/types";
```

After the `readingList` computation (around line 34), add:

```typescript
  // Fetch children for share dialog
  const rawChildren = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.parentId, session.user.id));
  const childrenList = rawChildren as Child[];

  let assignmentMap: Record<string, string[]> = {};
  if (childrenList.length > 0) {
    const assignments = await db
      .select()
      .from(childStories)
      .where(
        inArray(
          childStories.childId,
          childrenList.map((c) => c.id)
        )
      );
    for (const a of assignments) {
      if (!assignmentMap[a.storyId]) assignmentMap[a.storyId] = [];
      assignmentMap[a.storyId].push(a.childId);
    }
  }
```

Then in the "My Stories" section, add the share dialog inside each card's `<article>` (after the gradient cover div, as an absolute positioned element):

```typescript
{childrenList.length > 0 && (
  <div className="absolute left-3 top-3 z-10">
    <ShareStoryDialog
      storyId={story.id}
      children={childrenList}
      assignedChildIds={assignmentMap[story.id] ?? []}
    />
  </div>
)}
```

Do the same in the "Reading Progress" section cards — add the share dialog inside each card's article.

- [ ] **Step 4: Verify in browser**

Navigate to `/explore` while logged in with children profiles.

Expected: Share button (Users icon) appears on story cards. Clicking opens dialog with children avatars. Toggling and saving assigns/unassigns stories.

- [ ] **Step 5: Commit**

```bash
git add src/components/story-card.tsx src/app/explore/page.tsx src/app/library/page.tsx
git commit -m "feat: add share button to story cards for assigning stories to children"
```

---

## Task 19: Navbar — Dashboard Link

**Files:**
- Modify: `src/components/navbar.tsx:63-96,152-191`

- [ ] **Step 1: Add Dashboard link to navbar**

The navbar is a client component that uses `useSession()`. To know if the user has children, fetch the children count via API. Add state and effect:

After line 14 (`const { data: session } = useSession();`), add:

```typescript
const [hasChildren, setHasChildren] = useState(false);

useEffect(() => {
  if (!user) return;
  fetch("/api/children")
    .then((r) => r.json())
    .then((list) => setHasChildren(Array.isArray(list) && list.length > 0))
    .catch(() => {});
}, [user]);
```

Add the import for `LayoutDashboard` from lucide-react (line 6):

```typescript
import { BookOpen, LayoutDashboard, Library, LogIn, LogOut, Menu, Shield, X } from "lucide-react";
```

In the desktop nav (after the Explore button, before the My Library button, around line 73), add:

```typescript
{user && hasChildren && (
  <Button
    variant="ghost"
    size="lg"
    className="min-h-[44px] min-w-[44px] rounded-xl text-base font-semibold"
    render={<Link href="/dashboard" />}
  >
    <LayoutDashboard className="size-5" data-icon="inline-start" />
    Dashboard
  </Button>
)}
```

Do the same in the mobile nav section (around line 166), after the Explore button.

- [ ] **Step 2: Verify in browser**

Log in as a user with children. Check navbar.

Expected: "Dashboard" link appears between "Explore" and "My Library". Not visible for users without children.

- [ ] **Step 3: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: show Dashboard link in navbar when user has children"
```

---

## Task 20: Final Verification

- [ ] **Step 1: Full flow test**

Test the complete flow in the browser:

1. Log in → navigate to `/dashboard` → see empty state
2. Click "Add Your First Child" → fill form → submit → redirected to dashboard
3. See child card in grid
4. Navigate to `/explore` → see share button on story cards
5. Click share → select child → save
6. Navigate to `/dashboard` → click child card → see learning hub with assigned story
7. Click story → read in kid mode → make choices → progress saved
8. Hold exit button for 2s → return to dashboard
9. Check that story shows "Continue" in learning hub
10. Edit child profile → verify changes saved
11. Log out → verify `/dashboard` redirects to `/login`

- [ ] **Step 2: Verify library page still works**

Navigate to `/library` — ensure existing functionality (My Stories, Reading Progress) is unaffected.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final adjustments from integration testing"
```
