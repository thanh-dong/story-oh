# Interactive Stories App — Design

## Overview
Choose-your-own-adventure branching story app for children aged 4-12.

## Stack
- **Next.js** (App Router)
- **shadcn/ui** + Tailwind CSS
- **Supabase** (Auth magic link + Postgres DB)

## Data Model

### stories
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Story title |
| summary | text | Short description |
| cover_image | text | URL |
| price | numeric | 0 = free (reserved for future) |
| age_range | text | "4-8" or "8-12" |
| story_tree | jsonb | Branching content tree |

### story_tree structure
Flat map of nodes. Each node has `text`, optional `image`, and `choices` array.
Empty choices = ending.

```json
{
  "start": {
    "text": "You find a lost dragon egg...",
    "image": "url",
    "choices": [
      { "label": "Pick it up", "next": "pick_up" },
      { "label": "Leave it alone", "next": "leave" }
    ]
  },
  "ending_happy": {
    "text": "The dragon becomes your best friend!",
    "choices": []
  }
}
```

### user_stories (ownership + progress)
| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to auth.users |
| story_id | uuid | FK to stories |
| progress | jsonb | `{ current_node, history }` |

## Pages
- `/` — Homepage with hero + CTA
- `/login` — Magic link email input
- `/explore` — Story cards grid
- `/story/[id]` — Story detail page
- `/story/[id]/read` — Reader (core experience)
- `/library` — User's owned stories

## Reader UI
- Full-screen, one node at a time
- Large text, illustration area at top
- Big colorful choice buttons at bottom
- Empty choices = "The End" screen
- Auto-save progress on each choice

## Auth
- Supabase magic link (email only)
- Browse/explore without login
- Login required to start reading

## Not in MVP
- No payment (price field reserved)
- No story authoring UI (seed via DB)
- No illustrations (placeholder backgrounds)
- No sound/animation
- No admin panel
