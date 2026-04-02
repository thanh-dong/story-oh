# Children Profiles & Family Dashboard

## Overview

Add children profiles so parents can set up personalized learning for each child. Parents create profiles (name, age, languages, interests), assign stories to children, and children get an age-adapted learning hub. Stories remain standalone content — parents share them with one or more children.

## Feature Description

### Parent Dashboard (`/dashboard`)

The parent's home after login. Shows:

- Grid of children profiles: avatar, name, age (calculated from DOB)
- Quick stats per child: stories assigned, stories completed, in progress
- "Add Child" button (prominent, empty state guides first-time parents)
- Tapping a child opens their learning hub

### Add/Edit Child Profile

Form fields:
- **Name** — child's first name (required)
- **Date of birth** — date picker, used to calculate age (required)
- **Avatar** — pick from a preset grid of emoji/animals (required, default random)
- **Native language** — select: en, vi, de (required)
- **Learning languages** — multi-select: en, vi, de — languages the child is learning (can overlap with native)
- **Interests** — pick from tags: animals, space, dinosaurs, ocean, cooking, sports, music, fairy tales, robots, nature, friendship, adventure. Parent can type custom tags too.
- **Daily goal** — optional: 10, 15, 20, 30 min/day or "No goal"

### Child's Learning Hub (`/dashboard/[childId]`)

A kid-friendly screen when a child is selected:

- **Header**: "[Avatar] Hi [Name]!" with age badge
- **Assigned stories** section: cards of stories the parent shared with this child
- **In progress** section: stories the child has started but not finished (shows "Continue" button)
- **Completed** section: finished stories with a checkmark

If no stories are assigned yet, show an encouraging empty state: "No stories yet! Ask your parent to pick some for you." with a link back to explore (for the parent).

### Assigning Stories to Children

A "Share" button appears on story cards and story detail pages (for logged-in parents who have children profiles):

- Tapping opens a quick picker showing children avatars + names
- Parent taps one or more children
- Story appears in those children's learning hubs
- Can unassign later from the child's hub

This works for:
- Public stories (admin-created, on /explore)
- User's own stories (in /library)

### Kid Mode

When viewing a child's learning hub or when a child is reading a story from their hub:

- Simplified navigation: just the child's avatar, story content, and a "Back" button
- No credit info, no admin links, no settings
- Larger touch targets for younger children (age < 6)
- "Exit" or "Back to Dashboard" requires tapping and holding for 2 seconds (prevents accidental navigation by small children)

### Reading Progress Per Child

When a child reads a story from their hub:
- Progress is tracked per child (not per parent account)
- The `child_id` is associated with the `user_stories` progress entry
- Multiple children can read the same story independently with separate progress

## Database Changes

### New `children` table

```
children:
  id          uuid, PK, default random
  parent_id   text, FK → user(id), cascade delete
  name        text, not null
  date_of_birth  date, not null
  avatar      text, not null (emoji string)
  native_language  text, not null, default "en"
  learning_languages  jsonb, default ["en"]
  interests   jsonb, default []
  difficulty  text, not null, default "auto"  ("auto" | "easy" | "medium" | "hard")
  daily_goal_minutes  integer, nullable
  created_at  timestamp
```

### New `child_stories` table (assignment join table)

```
child_stories:
  child_id    uuid, FK → children(id), cascade delete
  story_id    uuid, FK → stories(id), cascade delete
  assigned_at timestamp, default now
  PK: (child_id, story_id)
```

### Modify `user_stories` table

Add column:
- `child_id` (uuid, nullable, FK → children) — when set, progress belongs to that child

This allows: same parent, same story, different children = different progress rows.

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Parent family dashboard — children list |
| `/dashboard/new` | Add child profile form |
| `/dashboard/[childId]` | Child's learning hub |
| `/dashboard/[childId]/edit` | Edit child profile |
| `/dashboard/[childId]/read/[storyId]` | Story reader in kid mode (tracks progress under this child) |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/children` | GET | List parent's children |
| `/api/children` | POST | Create child profile |
| `/api/children/[id]` | GET | Get child details |
| `/api/children/[id]` | PUT | Update child profile |
| `/api/children/[id]` | DELETE | Delete child profile |
| `/api/children/[id]/stories` | GET | List stories assigned to child |
| `/api/children/[id]/stories` | POST | Assign story to child `{ story_id }` |
| `/api/children/[id]/stories/[storyId]` | DELETE | Unassign story from child |

All routes require authentication. All routes verify the child belongs to the logged-in parent.

## Navigation Changes

- Logged-in users with children: navbar shows "Dashboard" link (replaces or sits alongside "My Library")
- Logged-in users without children: "My Library" as before, with a prompt to "Set up your family" somewhere
- The parent dashboard becomes the primary hub; library moves to a secondary role

## Scope Boundaries

### In scope (this phase)
- Children CRUD (create, read, update, delete profiles)
- Parent dashboard with children list
- Child learning hub (assigned stories, progress, completed)
- Assign/unassign stories to children
- Kid mode (simplified UI when reading from child's hub)
- Per-child reading progress

### Out of scope (later phases)
- Daily goal tracking with progress ring
- Streaks, badges, achievements
- Vocabulary cards / word learning module
- AI content recommendations based on interests
- Activity reports and analytics for parents
- Time-spent tracking
- Child PIN/login for mobile app
- Video/audio drill content type
