# Children Profiles & Family Dashboard — Implementation Design

## Overview

Implementation design for the children profiles feature described in `2026-04-02-children-profiles-design.md`. Covers database schema, API routes, page structure, components, and kid mode.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dashboard vs Library | Side by side — dashboard primary when children exist | Different purposes: dashboard = family, library = content creation |
| Languages/interests storage | JSONB columns | Small, read-heavy, per-child data. Matches existing patterns (`story_tree`, `progress`) |
| Share UI | Dialog from story card | Fastest flow — see story, tap share, pick children, done |
| Dashboard layout | Card grid | Matches existing story card pattern, visual and kid-friendly |
| Kid Mode | Separate layout under `/dashboard/[childId]` | Clean isolation — no conditional navbar hacks |

## Database Schema

### New `children` table

```typescript
export const children = pgTable("children", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: text("parent_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  avatar: text("avatar").notNull(),  // emoji string like "🦁"
  nativeLanguage: text("native_language").notNull().default("en"),
  learningLanguages: jsonb("learning_languages").notNull().default(["en"]),
  interests: jsonb("interests").notNull().default([]),
  difficulty: text("difficulty").notNull().default("auto"),  // "auto"|"easy"|"medium"|"hard"
  dailyGoalMinutes: integer("daily_goal_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### New `childStories` join table

```typescript
export const childStories = pgTable("child_stories", {
  childId: uuid("child_id").notNull().references(() => children.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.childId, table.storyId] }),
}));
```

### Modify `userStories`

Add column:
```typescript
childId: uuid("child_id").references(() => children.id),
```

Allows same story to have separate progress rows per child. Existing rows (childId null) represent parent's own reading progress — no data migration needed.

## API Routes

### Children CRUD

| Endpoint | Method | Logic |
|----------|--------|-------|
| `/api/children` | GET | Fetch all children where `parentId = session.user.id` |
| `/api/children` | POST | Validate body (name, dob, avatar required), insert with `parentId = session.user.id` |
| `/api/children/[id]` | GET | Fetch child, verify `parentId` matches session |
| `/api/children/[id]` | PUT | Validate body, update child, verify ownership |
| `/api/children/[id]` | DELETE | Delete child (cascade removes assignments + progress), verify ownership |

### Story assignments

| Endpoint | Method | Logic |
|----------|--------|-------|
| `/api/children/[id]/stories` | GET | Join `childStories` with `stories`, return assigned stories with progress from `userStories` (where `childId` matches) |
| `/api/children/[id]/stories` | POST | Body: `{ storyId }`. Insert into `childStories`. Verify child ownership and story exists |
| `/api/children/[id]/stories/[storyId]` | DELETE | Remove from `childStories`. Verify child ownership |

### Ownership helper

```typescript
async function verifyChildOwnership(childId: string, userId: string) {
  const [child] = await db.select().from(children)
    .where(and(eq(children.id, childId), eq(children.parentId, userId)));
  return child ?? null;
}
```

### Progress tracking change

The existing `/api/stories/[id]/progress` POST route accepts an optional `childId` in the body. When present, saves/updates progress in `userStories` with that `childId`, creating per-child progress rows.

## Pages & Layouts

### Route tree

```
src/app/dashboard/
├── page.tsx                          # Parent dashboard (server component)
├── new/
│   └── page.tsx                      # Add child form (client component)
├── [childId]/
│   ├── layout.tsx                    # Kid-mode layout (no navbar/footer)
│   ├── page.tsx                      # Child's learning hub (server component)
│   ├── edit/
│   │   └── page.tsx                  # Edit child form (client component)
│   └── read/
│       └── [storyId]/
│           └── page.tsx              # Story reader in kid mode (client component)
```

### Parent Dashboard (`/dashboard/page.tsx`)

Server component. Fetches children with stats (assigned count, completed count, in-progress count) via a single query joining `children` → `childStories` → `userStories`. Renders responsive card grid (1 col mobile, 2 col tablet, 3 col desktop). Each card shows avatar, name, age (calculated from DOB), quick stats. "Add Child" dashed card links to `/dashboard/new`. Empty state for first-time parents with prominent CTA. Uses existing root layout (navbar + footer visible).

### Add/Edit Child Forms

Client components at `/dashboard/new` and `/dashboard/[childId]/edit`. Form fields: name, DOB (date picker), avatar (grid of ~20 animal/nature emojis), native language (select), learning languages (multi-select), interests (tag picker with presets + custom input), daily goal (optional select). Submit POSTs/PUTs to `/api/children`. Redirects to dashboard on success. Uses root layout (parent-facing).

### Kid Layout (`[childId]/layout.tsx`)

No navbar, no footer. Minimal chrome: child's avatar + name top-left, "Back to Dashboard" hold-to-exit button. Reads child DOB, calculates age. If age < 6: adds `kid-young` CSS class for larger touch targets (64px min) and slightly larger fonts.

### Child's Learning Hub (`[childId]/page.tsx`)

Server component. Header: "[Avatar] Hi [Name]!" with age badge. Three sections: Assigned (story cards), In Progress (with "Continue" button), Completed (with checkmark). Empty state: "No stories yet! Ask your parent to pick some for you." with link to `/explore`.

### Kid Mode Reader (`[childId]/read/[storyId]/page.tsx`)

Client component wrapping existing `StoryReader`. Passes `childId` to progress save calls for per-child tracking. TTS button preserved. Uses kid layout.

## Components

### Share Dialog (`src/components/share-story-dialog.tsx`)

Triggered by share icon on story cards. Only rendered for logged-in users with children. Shows grid of children avatars + names as toggleable chips. Already-assigned children pre-selected. "Save" sends POST/DELETE to `/api/children/[id]/stories` per toggled child. Optimistic UI with error revert.

### Story Card Changes (`src/components/story-card.tsx`)

Add share icon button (Lucide `Share2` or `Users`). Only visible when user is logged in AND has children. Children list passed as prop from parent page component to avoid per-card API calls.

## Navigation Changes (`src/components/navbar.tsx`)

- User has children → "Dashboard" primary, "My Library" secondary
- User has no children → "My Library" as before
- Credits, admin, theme toggle unchanged

## Kid Mode Details

### Hold-to-exit

"Back to Dashboard" button uses press-and-hold: `pointerdown` starts 2-second timer with progress ring animation, `pointerup` before 2s cancels. `useState` + `setTimeout`, no library.

### Age-based styling

`kid-young` class (age < 6): min touch targets 64px, slightly larger fonts, more padding on interactive elements. Applied via Tailwind utilities.

### Hidden in kid mode

Navbar, footer, credits, admin links, settings, story price info, edit/delete actions.

### Visible in kid mode

Child avatar + name, story content, choices, TTS "Read Aloud" button, hold-to-exit back button, progress indicator.

## Scope Boundaries

### In scope

- Children CRUD (profiles with all fields from spec)
- Parent dashboard with card grid
- Child learning hub (assigned/in-progress/completed sections)
- Assign/unassign stories via share dialog on story cards
- Kid mode layout with hold-to-exit
- Per-child reading progress
- Age-based touch targets

### Out of scope (later phases)

- Daily goal tracking with progress ring
- Streaks, badges, achievements
- Vocabulary cards / word learning
- AI content recommendations
- Activity reports and analytics
- Time-spent tracking
- Child PIN/login
