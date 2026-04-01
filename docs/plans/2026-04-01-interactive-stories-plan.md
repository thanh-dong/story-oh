# Interactive Stories App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a choose-your-own-adventure story app for kids 4-12 with magic link auth, story browsing, and a branching reader.

**Architecture:** Next.js App Router with server components for data fetching, client components for the interactive reader. Supabase handles auth (magic link) and Postgres DB. shadcn/ui + Tailwind for kid-friendly UI.

**Tech Stack:** Next.js 14+, shadcn/ui, Tailwind CSS, Supabase (Auth + DB), TypeScript

---

### Task 1: Project Scaffolding

**Files:**
- Create: entire Next.js project via CLI

**Step 1: Create Next.js app**

```bash
cd /Users/thanhdq/sources/cursor_event_example
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init -d
```

**Step 4: Add shadcn components**

```bash
npx shadcn@latest add button card input label badge separator avatar
```

**Step 5: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Next.js + shadcn + Supabase deps"
```

---

### Task 2: Supabase Client Setup + Types

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/lib/types.ts`
- Modify: `src/middleware.ts`
- Create: `.env.local` (from template)

**Step 1: Create `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 2: Create browser client** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Create server client** `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**Step 4: Create middleware helper** `src/lib/supabase/middleware.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

**Step 5: Create middleware** `src/middleware.ts`

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

**Step 6: Create types** `src/lib/types.ts`

```typescript
export interface StoryChoice {
  label: string;
  next: string;
}

export interface StoryNode {
  text: string;
  image?: string;
  choices: StoryChoice[];
}

export interface StoryTree {
  [nodeId: string]: StoryNode;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  cover_image: string | null;
  price: number;
  age_range: string;
  story_tree: StoryTree;
  created_at: string;
}

export interface UserStory {
  user_id: string;
  story_id: string;
  progress: {
    current_node: string;
    history: string[];
  };
  story?: Story;
}
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add Supabase client setup, middleware, and types"
```

---

### Task 3: Database Schema (SQL)

**Files:**
- Create: `supabase/schema.sql`

**Step 1: Write schema**

```sql
-- Stories table
create table public.stories (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  summary text not null,
  cover_image text,
  price numeric default 0,
  age_range text not null default '4-8',
  story_tree jsonb not null,
  created_at timestamptz default now()
);

-- User stories (ownership + progress)
create table public.user_stories (
  user_id uuid references auth.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  progress jsonb default '{"current_node": "start", "history": ["start"]}',
  created_at timestamptz default now(),
  primary key (user_id, story_id)
);

-- RLS
alter table public.stories enable row level security;
alter table public.user_stories enable row level security;

-- Anyone can read stories
create policy "Stories are viewable by everyone"
  on public.stories for select using (true);

-- Users can read/write their own user_stories
create policy "Users can view own stories"
  on public.user_stories for select using (auth.uid() = user_id);

create policy "Users can insert own stories"
  on public.user_stories for insert with check (auth.uid() = user_id);

create policy "Users can update own stories"
  on public.user_stories for update using (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add database schema with RLS policies"
```

NOTE: Run this SQL in Supabase Dashboard > SQL Editor manually.

---

### Task 4: Seed Data

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Write seed with 3 sample stories**

Create 3 branching stories appropriate for kids: a dragon adventure, an underwater quest, and a space mission. Each with 5-8 nodes and 2-3 endings.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add seed data with 3 sample stories"
```

---

### Task 5: Layout + Navigation

**Files:**
- Create: `src/app/layout.tsx` (modify default)
- Create: `src/components/navbar.tsx`
- Create: `src/app/globals.css` (modify to add kid-friendly theme)

**Step 1: Update globals.css with kid-friendly colors**

Extend the shadcn theme with warm, playful colors. Use Nunito font from Google Fonts.

**Step 2: Create Navbar** `src/components/navbar.tsx`

Client component with:
- Logo/app name on left
- "Explore" link
- "My Library" link (if logged in)
- Login/Logout button
- Uses Supabase browser client to check auth state

**Step 3: Update layout.tsx**

- Import Nunito font
- Add Navbar
- Wrap children

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add layout with kid-friendly navbar"
```

---

### Task 6: Homepage

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Build homepage**

- Hero section with large playful heading ("Choose Your Adventure!")
- Subheading for parents ("Interactive stories for kids 4-12")
- Big "Explore Stories" CTA button → links to `/explore`
- Simple, colorful, minimal

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add homepage with hero section"
```

---

### Task 7: Login Page + Auth Callback

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`

**Step 1: Login page**

Client component with:
- Email input (shadcn Input)
- "Send Magic Link" button
- On submit: call `supabase.auth.signInWithOtp({ email })`
- Show success message: "Check your email for the magic link!"

**Step 2: Auth callback route** `src/app/auth/callback/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add magic link login + auth callback"
```

---

### Task 8: Explore Page

**Files:**
- Create: `src/app/explore/page.tsx`
- Create: `src/components/story-card.tsx`

**Step 1: Create StoryCard component**

Using shadcn Card:
- Colored placeholder div for cover image (gradient based on story id)
- Title, age badge, summary preview
- Links to `/story/[id]`

**Step 2: Create Explore page**

Server component:
- Fetch all stories from Supabase
- Render grid of StoryCards (responsive: 1 col mobile, 2 tablet, 3 desktop)

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add explore page with story cards"
```

---

### Task 9: Story Detail Page

**Files:**
- Create: `src/app/story/[id]/page.tsx`

**Step 1: Build story detail**

Server component:
- Fetch story by id
- Show cover/placeholder, title, full summary, age range
- "Start Reading" button → links to `/story/[id]/read`
- If user is logged in, auto-create user_stories entry when clicking start
- If not logged in, redirect to `/login?next=/story/[id]/read`

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add story detail page"
```

---

### Task 10: Story Reader (Core Experience)

**Files:**
- Create: `src/app/story/[id]/read/page.tsx`
- Create: `src/components/story-reader.tsx`

**Step 1: Create reader wrapper page**

Server component:
- Check auth (redirect to login if not authenticated)
- Fetch story data + user progress
- Create user_stories entry if first time
- Pass to client StoryReader component

**Step 2: Create StoryReader client component**

The core interactive component:
- Display current node's text (large, readable)
- Colored background area where illustration would go
- Render choice buttons (big, colorful, rounded)
- On choice click: update state to next node, save progress to Supabase
- When choices empty: show "The End" screen with confetti-style message
- "Read Again" button (reset to start) + "Back to Library" button

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add interactive story reader with progress saving"
```

---

### Task 11: Library Page

**Files:**
- Create: `src/app/library/page.tsx`

**Step 1: Build library page**

Server component:
- Check auth (redirect to login if not)
- Fetch user_stories joined with stories for current user
- Show grid of owned story cards with progress indicator
- "Continue Reading" or "Read Again" based on progress
- Empty state: "No stories yet! Explore stories to get started."

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add library page with user's stories"
```

---

### Task 12: Final Polish + Smoke Test

**Step 1: Review all pages for consistency**
**Step 2: Test full flow: Home → Explore → Detail → Login → Read → Library**
**Step 3: Final commit**

```bash
git add -A && git commit -m "chore: final polish and cleanup"
```
