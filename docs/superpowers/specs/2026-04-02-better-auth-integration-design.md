# Better-Auth Integration

## Overview

Replace Supabase Auth and Supabase JS client with better-auth + Drizzle ORM. The existing Supabase Postgres database is retained, accessed directly via `DATABASE_URL`. Two modes: development (seeded accounts, no verification) and production (email/password + Google OAuth, email verification, admin roles).

## Environment & Mode Switching

Controlled by `NODE_ENV`:

**Development** (`npm run dev`):
- Email/password login, no email verification
- No OAuth providers needed
- Seeded test accounts: `admin@test.com` (admin), `user@test.com` (user), password `password123`

**Production** (`npm run build`):
- Email/password with email verification
- Google OAuth
- Admin accounts managed via seed script

**Shared env vars:**
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
BETTER_AUTH_SECRET=<min-32-chars>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

`BETTER_AUTH_URL` is for the server, `NEXT_PUBLIC_BETTER_AUTH_URL` is for the browser client. Same value.

**Production-only:**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Env vars to remove** (from old Supabase setup):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Database Schema (Drizzle)

### Better-auth managed tables

Created automatically by better-auth:

- `user` — id, name, email, emailVerified, image, role, createdAt, updatedAt
- `account` — id, userId, providerId, accountId, accessToken, refreshToken, etc.
- `session` — id, token, userId, expiresAt, ipAddress, userAgent
- `verification` — id, identifier, value, expiresAt

Custom field: `role` on `user` table — `"user" | "admin"`, default `"user"`.

### App tables

Defined in Drizzle schema, same structure as current:

```typescript
// stories table
export const stories = pgTable("stories", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  cover_image: text("cover_image"),
  price: real("price").default(0),
  age_range: text("age_range").notNull().default("4-8"),
  require_login: boolean("require_login").notNull().default(false),
  story_tree: jsonb("story_tree").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// user_stories table
// Note: user_id is text, matching better-auth's string user IDs.
// The existing column is uuid — migration step: ALTER COLUMN user_id TYPE text;
export const userStories = pgTable("user_stories", {
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  story_id: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  progress: jsonb("progress").default({ current_node: "start", history: ["start"] }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.story_id] }),
}));
```

### Naming convention

Drizzle schema uses **snake_case** property names matching the database column names exactly. This preserves compatibility with the existing `Story` and `UserStory` TypeScript interfaces in `src/lib/types.ts` — query results will have `story_tree`, `age_range`, etc. matching the current types. No interface changes needed.

The `price` column uses `real()` instead of `numeric()` so Drizzle returns a JavaScript `number` (not `string`), matching the existing `price: number` type.

### Migration strategy

1. Drop the FK constraint on `user_stories.user_id` (currently references `auth.users` which will be removed)
2. `ALTER TABLE user_stories ALTER COLUMN user_id TYPE text;` (convert from uuid to text for better-auth IDs)
3. Drop all RLS policies (auth is now app-level)
4. Define Drizzle schema for all tables (better-auth + app)
5. Run `drizzle-kit push` to sync schema — creates better-auth tables
6. Existing story data stays intact
7. Old `user_stories` rows from Supabase auth users become orphaned (acceptable — delete them)

## File Structure

```
src/lib/
├── auth.ts              # Better-auth server config
├── auth-client.ts       # Better-auth browser client
├── db/
│   ├── index.ts         # Drizzle client (pg connection)
│   └── schema.ts        # All table definitions
```

### Auth server config (`src/lib/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
    ...(process.env.GOOGLE_CLIENT_ID && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh after 1 day
  },
});
```

Exports a helper:
```typescript
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
```

### Auth browser client (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "",
});

export const { useSession, signIn, signUp, signOut } = authClient;
```

### API route (`src/app/api/auth/[...all]/route.ts`)

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

## Auth Checks & Protected Routes

### Middleware (`src/middleware.ts`)

Protects `/admin/*` routes only. This is intentionally narrower than the current middleware (which ran on all routes to refresh Supabase sessions). Better-auth manages sessions through its own cookie mechanism via the `/api/auth/*` catch-all route. Non-admin routes check auth at the page/API level via `getSession()`.

```typescript
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/api/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

### Route auth rules

| Route | Auth Rule |
|-------|-----------|
| `/`, `/explore`, `/story/[id]` | Public |
| `/story/[id]/read` | Check `story.require_login` — redirect if true and no session |
| `/library` | Require session — redirect to `/login` |
| `/admin/*` | Require session + admin role (middleware) |
| `/api/admin/*` | Require session + admin role (middleware) |
| `/login`, `/signup` | Public — redirect to `/` if already authenticated |

## Login & Signup UI

### `/login` page

- Email + password form
- Google OAuth button (only when `GOOGLE_CLIENT_ID` is set — passed via server component prop or env check)
- Link to `/signup`
- `?next=` query param for post-login redirect
- **Dev mode panel:** below the form, shows seeded test accounts with one-click login buttons (only when `NODE_ENV === "development"`, checked server-side and passed as prop). Each button calls `signIn.email({ email, password })` from better-auth client with the seeded credentials.

### `/signup` page (new)

- Name, email, password form
- Google OAuth button (same conditional)
- Link to `/login`
- In dev: auto-verifies email. In prod: shows "check your email" message

### Post-auth redirect

- After login/signup, redirect to `?next` param or `/` by default
- OAuth callback handled by better-auth automatically

## Database Query Migration

All `supabase.from(...)` calls become Drizzle queries:

| Current | New |
|---|---|
| `supabase.from("stories").select("*")` | `db.select().from(stories)` |
| `.eq("id", id).single()` | `.where(eq(stories.id, id))` then `[0]` |
| `.insert({...}).select().single()` | `db.insert(stories).values({...}).returning()` then `[0]` |
| `.update({...}).eq("id", id)` | `db.update(stories).set({...}).where(eq(stories.id, id))` |
| `.delete().eq("id", id)` | `db.delete(stories).where(eq(stories.id, id))` |
| `.select("*, story:stories(*)")` join | `db.select().from(userStories).innerJoin(stories, eq(...))` |

### Progress API route

`POST /api/stories/[id]/progress` — replaces the client-side Supabase call in `story-reader.tsx`.

**Request:**
```json
{ "current_node": "explore_cave", "history": ["start", "go_left", "explore_cave"] }
```

**Auth:** Uses `getSession()` server-side to identify the user. No `userId` in the request body.

**Behavior:**
1. Get session — return 401 if not authenticated
2. Upsert into `user_stories` — update progress if exists, insert if not
3. Return 200 on success

**Response:** `{ "ok": true }` or `{ "error": "..." }`

The `story-reader.tsx` component calls this via `fetch("/api/stories/${storyId}/progress", { method: "POST", body })` instead of the current direct Supabase client call.

### Files that change

| File | Change |
|------|--------|
| `src/app/api/admin/stories/route.ts` | Drizzle queries (admin auth via middleware) |
| `src/app/api/admin/stories/[id]/route.ts` | Drizzle queries (admin auth via middleware) |
| `src/app/api/admin/stories/generate/route.ts` | No DB change (admin auth via middleware) |
| `src/app/explore/page.tsx` | Drizzle query, remove Supabase import |
| `src/app/story/[id]/page.tsx` | Drizzle query, remove Supabase import |
| `src/app/story/[id]/read/page.tsx` | Drizzle queries + `getSession()` |
| `src/app/library/page.tsx` | Drizzle join query + `getSession()` |
| `src/app/page.tsx` | Drizzle query, remove Supabase import |
| `src/components/story-reader.tsx` | Remove Supabase client, call new progress API |
| `src/components/navbar.tsx` | Replace Supabase auth with `useSession()` |
| `src/middleware.ts` | Replace Supabase middleware with admin role check |
| `src/app/login/page.tsx` | Rewrite with better-auth `signIn` |
| `src/app/admin/stories/new/page.tsx` | Update `handleSave` type (minor) |

### New files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Better-auth server config + `getSession()` helper |
| `src/lib/auth-client.ts` | Better-auth browser client |
| `src/lib/db/index.ts` | Drizzle client connection |
| `src/lib/db/schema.ts` | All table definitions |
| `src/app/api/auth/[...all]/route.ts` | Better-auth catch-all route handler |
| `src/app/api/stories/[id]/progress/route.ts` | Progress saving API (replaces client-side Supabase) |
| `src/app/signup/page.tsx` | New signup page |
| `src/lib/db/seed.ts` | Dev seed script for test accounts |
| `drizzle.config.ts` | Drizzle Kit configuration |

### Files removed

| File | Reason |
|------|--------|
| `src/lib/supabase/client.ts` | Replaced by `auth-client.ts` |
| `src/lib/supabase/server.ts` | Replaced by `db/index.ts` + `auth.ts` |
| `src/lib/supabase/middleware.ts` | Replaced by better-auth middleware |
| `src/app/api/dev-login/route.ts` | Replaced by better-auth built-in routes |
| `src/app/auth/callback/route.ts` | Replaced by better-auth OAuth callback |

### Dependencies

**Add:** `better-auth`, `drizzle-orm`, `drizzle-kit`, `pg` (postgres driver)

**Remove:** `@supabase/ssr`, `@supabase/supabase-js`

## Dev Seed Script

`src/lib/db/seed.ts` — run via `npx tsx src/lib/db/seed.ts`:

- Creates admin account: `admin@test.com` / `password123` / role: `admin`
- Creates user account: `user@test.com` / `password123` / role: `user`
- Idempotent — skips if accounts already exist
- Add to `package.json`: `"db:seed": "tsx src/lib/db/seed.ts"`

## Out of Scope

- Email sending setup (use console logs in dev, configure SMTP for prod later)
- Rate limiting (better-auth has built-in support, enable later)
- 2FA / passkeys (better-auth plugins, add later)
- Additional OAuth providers beyond Google (add later)
- User profile editing UI
- Admin user management UI
