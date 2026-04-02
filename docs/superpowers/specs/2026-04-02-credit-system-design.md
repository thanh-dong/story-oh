# Credit Point System

## Overview

Add a credit system for AI story generation. Users start with 100 free credits. Each AI generation has an estimated cost shown upfront, with actual cost calculated from token usage after generation. Admins are exempt from credits and can manage user balances.

## Database Changes

### Add `credits` column to `user` table

```sql
ALTER TABLE "user" ADD COLUMN credits INTEGER NOT NULL DEFAULT 100;
```

Drizzle schema addition on `user` table (add `integer` to the import from `drizzle-orm/pg-core`):
```typescript
credits: integer("credits").notNull().default(100),
```

### New `credit_transactions` table

```typescript
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // positive = grant, negative = spend
  balance_after: integer("balance_after").notNull(),
  type: text("type").notNull(), // "generation" | "admin_grant" | "admin_deduct" | "signup_bonus"
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("credit_transactions_user_id_idx").on(table.user_id),
]);
```

Add `index` to the import from `drizzle-orm/pg-core`.

## Cost Formula

### Estimation (before generation)

```
estimated_cost = base(5) + (reading_time * 3) + (max_branches * 2) + difficulty_bonus

difficulty_bonus: easy = 0, medium = 3, hard = 6
```

Example costs:

| Story Type | Reading Time | Max Branches | Difficulty | Estimated Cost |
|------------|-------------|-------------|------------|----------------|
| Quick simple | 3 min | 3 | easy | 5 + 9 + 6 + 0 = **20** |
| Medium | 5 min | 5 | medium | 5 + 15 + 10 + 3 = **33** |
| Long complex | 10 min | 8 | hard | 5 + 30 + 16 + 6 = **57** |

### Actual cost (after generation)

```
token_ratio = actual_completion_tokens / max_tokens_requested (4096)
actual_cost = round(estimated_cost * token_ratio)
final_cost = clamp(actual_cost, min: 5, max: estimated_cost * 1.2)
```

If the LLM uses fewer tokens, user pays proportionally less. Minimum 5 credits. Capped at 120% of estimate.

### Cost calculation utility

New file: `src/lib/credits.ts`

```typescript
export function estimateCost(params: {
  expectedReadingTime: number;
  maxBranches: number;
  difficulty: "easy" | "medium" | "hard";
}): number {
  const base = 5;
  const timeCost = params.expectedReadingTime * 3;
  const branchCost = params.maxBranches * 2;
  const difficultyBonus = { easy: 0, medium: 3, hard: 6 }[params.difficulty];
  return base + timeCost + branchCost + difficultyBonus;
}

export function calculateActualCost(
  estimatedCost: number,
  completionTokens: number,
  maxTokens: number = 4096
): number {
  const ratio = completionTokens / maxTokens;
  const raw = Math.round(estimatedCost * ratio);
  const min = 5;
  const max = Math.round(estimatedCost * 1.2);
  return Math.max(min, Math.min(max, raw));
}
```

## Generation Flow Changes

### User generation (`POST /api/stories/generate`)

New route (separate from admin). Flow:

1. Get session — return 401 if unauthenticated
2. Validate input parameters
3. Calculate `estimatedCost` from params
4. Check `user.credits >= estimatedCost` — return 402 with `{ error: "Insufficient credits", credits: user.credits, estimated_cost: estimatedCost }` if insufficient
5. Call LLM (reuse `buildPrompt` and `validateStoryTree` from admin route — extract into shared `src/lib/story-generation.ts`)
6. Extract `completion_tokens` from LLM response `json.usage.completion_tokens` (standard OpenAI-compatible field, available alongside `choices`)
7. Calculate `actualCost` using `calculateActualCost()`
8. In a database transaction:
   - Deduct credits with guard: `UPDATE "user" SET credits = credits - actualCost WHERE id = userId AND credits >= actualCost` — if zero rows affected, rollback and return 402 (race condition: credits spent concurrently)
   - Insert credit_transaction: `{ amount: -actualCost, balance_after: newBalance, type: "generation", description: "Generated story: {keyword}, {readingTime}min, {difficulty}", metadata: { params, completion_tokens, estimated_cost, actual_cost } }`
9. Return generated story + `{ credits_charged: actualCost, credits_remaining: newBalance }`

### Admin generation (`POST /api/admin/stories/generate`)

No changes — admins are exempt from credit checks.

### Cost estimation endpoint

`POST /api/stories/estimate-cost`

Request: `{ expectedReadingTime, maxBranches, difficulty }`
Response: `{ estimated_cost: number }`

Alternatively, calculate client-side since the formula is simple. **Recommendation: client-side** — export `estimateCost()` and import in the form component. No API call needed.

## Admin User Management

### New page: `/admin/users`

List all users with columns:
- Name, email, role, credits balance, signup date
- Actions: Grant credits, Deduct credits, View history

### New page: `/admin/users/[id]/transactions`

Transaction history for a user — table showing date, type, amount, balance_after, description.

### Admin API routes

`GET /api/admin/users` — list all users with credits

```typescript
// Returns: [{ id, name, email, role, credits, createdAt }]
```

`POST /api/admin/users/[id]/credits` — grant or deduct credits

```typescript
// Request: { amount: number, note?: string }
// amount > 0 = grant, amount < 0 = deduct
// Response: { credits: newBalance, transaction: { id, amount, balance_after, ... } }
```

`GET /api/admin/users/[id]/transactions` — credit transaction history

```typescript
// Returns: [{ id, amount, balance_after, type, description, created_at }]
```

## UI Changes

### Generate Story Form (`src/components/admin/generate-story-form.tsx`)

When used in user context (not admin):
- Show "Estimated cost: ~X credits" below the form, updates live as params change
- Show current balance: "Your balance: Y credits"
- Disable Generate button if `estimatedCost > credits`
- After generation: show "Charged: Z credits (Y remaining)"

New props on the form:
- `credits?: number` — undefined = admin mode (no cost shown), number = user mode (show cost)
- `generateEndpoint?: string` — defaults to `/api/admin/stories/generate`. User pages pass `/api/stories/generate`.

### Fetching credits on the client

Credits are NOT in the better-auth session (adding custom fields to the session requires plugin work). Instead, use a simple API route:

`GET /api/me/credits` — returns `{ credits: number }` for the logged-in user.

The navbar and library page fetch this endpoint to display the balance. The `GenerateStoryForm` receives credits as a prop from the parent page (which fetches it).

New file: `src/app/api/me/credits/route.ts`

### Navbar

Add credit balance badge next to user avatar for logged-in non-admin users:
- Small pill: "42 ✦" (or similar compact display)

### Admin Navigation

Add "Users" link in admin pages (alongside story management).

## File Changes

### New files

| File | Purpose |
|------|---------|
| `src/lib/credits.ts` | Cost estimation and calculation utilities |
| `src/lib/story-generation.ts` | Shared prompt building and validation (extracted from admin route) |
| `src/app/api/stories/generate/route.ts` | User generation with credit check |
| `src/app/api/me/credits/route.ts` | Get current user's credit balance |
| `src/app/admin/users/page.tsx` | Admin user list |
| `src/app/admin/users/[id]/transactions/page.tsx` | User transaction history |
| `src/app/api/admin/users/route.ts` | List users API |
| `src/app/api/admin/users/[id]/credits/route.ts` | Grant/deduct credits API |
| `src/app/api/admin/users/[id]/transactions/route.ts` | Transaction history API |

### Modified files

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add `credits` + `integer` + `index` to imports, add `creditTransactions` table |
| `src/app/api/admin/stories/generate/route.ts` | Extract shared logic to `story-generation.ts`, import from there |
| `src/components/admin/generate-story-form.tsx` | Add cost estimate display, `credits` + `generateEndpoint` props |
| `src/app/library/stories/new/page.tsx` | Fetch credits, pass to form, use `/api/stories/generate` |
| `src/components/navbar.tsx` | Fetch and show credit balance badge for non-admin users |
| `src/app/admin/page.tsx` | Add "Users" navigation link |
| `src/lib/types.ts` | Add `GenerateStoryWithCreditsResponse` extending `GenerateStoryResponse` with credit fields |

### Unchanged

- Admin story generation route — no credit check
- Manual story creation — no credit cost
- Reading, progress, explore — no changes
- Admin story CRUD — no changes

## Out of Scope

- Purchasing credits (future: payment integration)
- Monthly credit reset / subscription tiers
- Credit transfer between users
- Generation history page for users (future)
- Webhook/email notifications for low credits
