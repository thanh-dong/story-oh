# Vocabulary Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-generated vocabulary learning system where parents request weekly plans and kids learn words through interactive listen-and-repeat with personalized TTS prompts.

**Architecture:** Three new DB tables (vocabularyPlans, vocabularyWords, vocabularyProgress) + AI generation module + credit calculation + API routes + parent dashboard UI + kid mode vocabulary screen with split-view layout and quick check quiz.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL (Supabase), OpenAI TTS-1, GPT-4o, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-vocabulary-learning-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| _(tables added directly to `src/lib/db/schema.ts`)_ | vocabularyPlans, vocabularyWords, vocabularyProgress tables |
| `src/lib/vocabulary-types.ts` | TypeScript interfaces for vocabulary plan, words, progress, API requests/responses |
| `src/lib/vocabulary-credits.ts` | Deterministic credit cost formula |
| `src/lib/vocabulary-generation.ts` | AI prompt construction, response parsing, plan validation |
| `src/app/api/vocabulary/plans/route.ts` | POST (create draft), GET (list plans) |
| `src/app/api/vocabulary/plans/[planId]/route.ts` | GET (plan details + words) |
| `src/app/api/vocabulary/plans/[planId]/approve/route.ts` | POST (approve, charge credits, trigger TTS) |
| `src/app/api/vocabulary/plans/[planId]/regenerate/route.ts` | POST (regenerate draft) |
| `src/app/api/vocabulary/plans/[planId]/cancel/route.ts` | POST (cancel plan) |
| `src/app/api/vocabulary/progress/route.ts` | POST (record listened/quiz) |
| `src/app/api/vocabulary/progress/[planId]/route.ts` | GET (progress for plan) |
| `src/components/vocabulary/create-plan-dialog.tsx` | Parent: create plan form in dialog |
| `src/components/vocabulary/plan-review.tsx` | Parent: review draft plan, approve/regenerate |
| `src/components/vocabulary/plan-progress.tsx` | Parent: monitor active plan progress |
| `src/components/vocabulary/word-list.tsx` | Kid: vertical word list (left panel) |
| `src/components/vocabulary/word-detail.tsx` | Kid: word detail view with TTS (right panel) |
| `src/components/vocabulary/quick-check.tsx` | Kid: multiple choice quiz at end of topic |
| `src/app/dashboard/[childId]/read/vocabulary/[planId]/page.tsx` | Kid: vocabulary learning screen |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add vocabulary table definitions directly (avoids circular imports) |
| `src/lib/types.ts` | Import + re-export vocabulary types |
| `src/app/dashboard/[childId]/page.tsx` | Add vocabulary card to child dashboard |
| `src/app/dashboard/[childId]/read/page.tsx` | Add "Today's Words" section to reading hub |

---

## Task 1: Database Schema

**Files:**
- Modify: `src/lib/db/schema.ts` (add vocabulary tables at the bottom)
- Depends on: Task 2 (types) — create types first, then schema references them

> **Note:** Tables are defined directly in `schema.ts` to avoid circular imports. All existing tables live in this file and all API routes import from `@/lib/db/schema`.

- [ ] **Step 1: Add vocabulary tables to schema.ts**

Append the following to the end of `src/lib/db/schema.ts`:

```ts
// ─── Vocabulary Tables ───

import type { VocabularyPlan } from "@/lib/vocabulary-types";

export const vocabularyPlans = pgTable(
  "vocabulary_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    learningLanguage: text("learning_language").notNull(),
    nativeLanguage: text("native_language").notNull(),
    weekStartDate: date("week_start_date").notNull(),
    weeksRequested: integer("weeks_requested").notNull(),
    status: text("status").notNull().default("draft"),
    creditsCost: integer("credits_cost").notNull().default(0),
    wordsTotal: integer("words_total").notNull().default(0),
    wordsAudioReady: integer("words_audio_ready").notNull().default(0),
    plan: jsonb("plan").$type<VocabularyPlan>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("vocab_plans_child_lang_status_idx").on(
      table.childId,
      table.learningLanguage,
      table.status
    ),
    // Note: A partial unique index on (childId, learningLanguage) WHERE status IN ('active','approved')
    // is enforced at the application level in the POST /api/vocabulary/plans route.
    // Drizzle does not support partial unique indexes natively. If needed, add via raw SQL migration:
    // CREATE UNIQUE INDEX vocab_plans_active_uniq ON vocabulary_plans(child_id, learning_language)
    //   WHERE status IN ('active', 'approved');
  ]
);

export const vocabularyWords = pgTable(
  "vocabulary_words",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => vocabularyPlans.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    topic: text("topic").notNull(),
    day: integer("day").notNull(),
    weekNumber: integer("week_number").notNull(),
    promptSentence: text("prompt_sentence").notNull(),
    pronunciation: text("pronunciation").notNull(),
    emoji: text("emoji").notNull(),
    audioUrl: text("audio_url"),
    audioGeneratedAt: timestamp("audio_generated_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("vocab_words_plan_week_day_idx").on(
      table.planId,
      table.weekNumber,
      table.day
    ),
  ]
);

export const vocabularyProgress = pgTable(
  "vocabulary_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => vocabularyWords.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => vocabularyPlans.id, { onDelete: "cascade" }),
    listened: boolean("listened").notNull().default(false),
    quizCorrect: boolean("quiz_correct"),
    quizAttempts: integer("quiz_attempts").notNull().default(0),
    listenedAt: timestamp("listened_at", { withTimezone: true, mode: "string" }),
    quizzedAt: timestamp("quizzed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("vocab_progress_child_plan_idx").on(table.childId, table.planId),
  ]
);
```

- [ ] **Step 2: Push schema to database**

Run: `npm run db:push`

> **Note:** This is interactive — run in user terminal via `! npm run db:push`

Expected: Tables `vocabulary_plans`, `vocabulary_words`, `vocabulary_progress` created with indexes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(vocab): add vocabulary plans, words, and progress tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/lib/vocabulary-types.ts`

- [ ] **Step 1: Create vocabulary types**

```ts
// src/lib/vocabulary-types.ts

export interface VocabularyWordEntry {
  word: string;
  emoji: string;
  pronunciation: string;
  promptSentence: string;
}

export interface VocabularyDay {
  day: number;
  topic: string;
  isReview: boolean;
  words: VocabularyWordEntry[];
}

export interface VocabularyWeek {
  weekNumber: number;
  days: VocabularyDay[];
}

export interface VocabularyPlan {
  weeks: VocabularyWeek[];
  quizOptions: {
    choiceCount: number;
  };
}

export type VocabularyPlanStatus =
  | "draft"
  | "approved"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

export interface CreatePlanRequest {
  childId: string;
  learningLanguage: string;
  weeksRequested: number;
}

export interface RecordProgressRequest {
  wordId: string;
  planId: string;
  childId: string;
  type: "listened" | "quiz";
  quizCorrect?: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/vocabulary-types.ts
git commit -m "feat(vocab): add vocabulary TypeScript interfaces"
```

---

## Task 3: Credit Calculation

**Files:**
- Create: `src/lib/vocabulary-credits.ts`

- [ ] **Step 1: Create credit calculation module**

```ts
// src/lib/vocabulary-credits.ts

export function estimateVocabularyCost(
  weeksRequested: number,
  childAge: number
): number {
  const baseCost = 3;
  const wordsPerWeek = childAge <= 6 ? 25 : childAge <= 9 ? 35 : 45;
  const costPerWord = 0.15;
  return Math.round(baseCost + wordsPerWeek * weeksRequested * costPerWord);
}

export function getWordsPerWeekForAge(childAge: number): number {
  return childAge <= 6 ? 25 : childAge <= 9 ? 35 : 45;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/vocabulary-credits.ts
git commit -m "feat(vocab): add vocabulary credit cost calculation"
```

---

## Task 4: AI Plan Generation

**Files:**
- Create: `src/lib/vocabulary-generation.ts`

- [ ] **Step 1: Create vocabulary generation module**

```ts
// src/lib/vocabulary-generation.ts
import type { VocabularyPlan } from "@/lib/vocabulary-types";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  de: "German",
};

const PLAN_RESPONSE_SCHEMA = `{
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "day": 1,
          "topic": "string",
          "isReview": false,
          "words": [
            {
              "word": "string (in learning language)",
              "emoji": "string (single emoji)",
              "pronunciation": "string (IPA format)",
              "promptSentence": "string (native language prompt)"
            }
          ]
        }
      ]
    }
  ],
  "quizOptions": {
    "choiceCount": 3
  }
}`;

function buildVocabularyPrompt(params: {
  childName: string;
  childAge: number;
  interests: string[];
  nativeLanguage: string;
  learningLanguage: string;
  weeksRequested: number;
}): { system: string; user: string } {
  const {
    childName,
    childAge,
    interests,
    nativeLanguage,
    learningLanguage,
    weeksRequested,
  } = params;

  const nativeLangName = LANGUAGE_NAMES[nativeLanguage] || nativeLanguage;
  const learningLangName = LANGUAGE_NAMES[learningLanguage] || learningLanguage;

  const wordsPerTopic =
    childAge <= 6 ? "3-5" : childAge <= 9 ? "5-7" : "6-8";
  const quizChoices = childAge <= 6 ? 2 : childAge <= 9 ? 3 : 4;
  const complexity =
    childAge <= 6
      ? "very simple, everyday words a young child encounters (animals, colors, body parts, food, family)"
      : childAge <= 9
        ? "moderate vocabulary including descriptive words, actions, and common objects"
        : "richer vocabulary including abstract concepts, compound words, and subject-specific terms";

  const system = `You are a language learning curriculum designer for children. You create weekly vocabulary learning plans in JSON format.

CHILD PROFILE:
- Name: ${childName}
- Age: ${childAge} years old
- Native language: ${nativeLangName}
- Learning: ${learningLangName}
- Interests: ${interests.length > 0 ? interests.join(", ") : "general"}

PLAN RULES:
- Create exactly ${weeksRequested} week(s) of vocabulary content
- Each week has 7 days (day 1 = Monday through day 7 = Sunday)
- Days 1-5 (Monday-Friday): new learning topics with ${wordsPerTopic} words each
- Days 6-7 (Saturday-Sunday): review days mixing words from the week (isReview: true)
- Harder or broader topics may span 2 consecutive days
- Topics should connect to the child's interests when possible
- Word complexity: ${complexity}
- Each word needs an emoji, IPA pronunciation, and a native-language prompt sentence

PROMPT SENTENCE RULES:
- Written in ${nativeLangName}, personalized with "${childName}"
- Warm, encouraging, conversational — like a parent or tutor talking to the child
- Include "repeat after me" naturally woven in with varied phrasings
- End with the word clearly in ${learningLangName}
- EVERY sentence must be UNIQUE — vary structure, tone, and phrasing
- Keep sentences natural and smooth, easy for a ${childAge}-year-old to understand

QUIZ OPTIONS:
- Set choiceCount to ${quizChoices}

Output ONLY valid JSON matching this schema:
${PLAN_RESPONSE_SCHEMA}`;

  const user = `Create a ${weeksRequested}-week ${learningLangName} vocabulary plan for ${childName} (age ${childAge}). ${
    interests.length > 0
      ? `Include topics related to: ${interests.join(", ")}.`
      : "Use common everyday topics appropriate for the age."
  }`;

  return { system, user };
}

export function validateVocabularyPlan(plan: unknown): plan is VocabularyPlan {
  if (typeof plan !== "object" || plan === null || Array.isArray(plan))
    return false;
  const p = plan as Record<string, unknown>;

  if (!Array.isArray(p.weeks) || p.weeks.length === 0) return false;

  for (const week of p.weeks) {
    const w = week as Record<string, unknown>;
    if (typeof w.weekNumber !== "number") return false;
    if (!Array.isArray(w.days) || w.days.length === 0) return false;

    for (const day of w.days) {
      const d = day as Record<string, unknown>;
      if (typeof d.day !== "number" || d.day < 1 || d.day > 7) return false;
      if (typeof d.topic !== "string") return false;
      if (typeof d.isReview !== "boolean") return false;
      if (!Array.isArray(d.words) || d.words.length === 0) return false;

      for (const word of d.words) {
        const wrd = word as Record<string, unknown>;
        if (typeof wrd.word !== "string") return false;
        if (typeof wrd.emoji !== "string") return false;
        if (typeof wrd.pronunciation !== "string") return false;
        if (typeof wrd.promptSentence !== "string") return false;
      }
    }
  }

  if (
    typeof p.quizOptions !== "object" ||
    p.quizOptions === null ||
    typeof (p.quizOptions as Record<string, unknown>).choiceCount !== "number"
  )
    return false;

  return true;
}

export function countWordsInPlan(plan: VocabularyPlan): number {
  let count = 0;
  for (const week of plan.weeks) {
    for (const day of week.days) {
      count += day.words.length;
    }
  }
  return count;
}

export interface VocabularyGenerationResult {
  plan: VocabularyPlan;
  completionTokens: number;
}

export async function generateVocabularyPlan(params: {
  childName: string;
  childAge: number;
  interests: string[];
  nativeLanguage: string;
  learningLanguage: string;
  weeksRequested: number;
}): Promise<
  | { ok: true; data: VocabularyGenerationResult }
  | { ok: false; error: string; status: number }
> {
  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL;

  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    return { ok: false, error: "AI provider not configured.", status: 500 };
  }

  const { system, user } = buildVocabularyPrompt(params);

  let llmResponse: Response;
  try {
    llmResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "AI request timed out. Please try again."
        : "Failed to connect to AI provider.";
    return { ok: false, error: message, status: 500 };
  }

  if (!llmResponse.ok) {
    const text = await llmResponse.text().catch(() => "unknown error");
    return {
      ok: false,
      error: `AI provider returned ${llmResponse.status}: ${text}`,
      status: 500,
    };
  }

  let json: any;
  try {
    json = await llmResponse.json();
  } catch {
    return { ok: false, error: "AI returned invalid JSON.", status: 500 };
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, error: "AI returned an empty response.", status: 500 };
  }

  let result: VocabularyPlan;
  try {
    result = JSON.parse(content);
  } catch {
    return { ok: false, error: "AI returned invalid JSON.", status: 500 };
  }

  if (!validateVocabularyPlan(result)) {
    return {
      ok: false,
      error: "AI generated an invalid vocabulary plan. Please try again.",
      status: 500,
    };
  }

  const completionTokens = json.usage?.completion_tokens ?? 0;

  return {
    ok: true,
    data: { plan: result, completionTokens },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/vocabulary-generation.ts
git commit -m "feat(vocab): add AI vocabulary plan generation with prompt builder and validation"
```

---

## Task 5: API — Create & List Plans

**Files:**
- Create: `src/app/api/vocabulary/plans/route.ts`

- [ ] **Step 1: Create the plans API route**

```ts
// src/app/api/vocabulary/plans/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { estimateVocabularyCost } from "@/lib/vocabulary-credits";
import {
  generateVocabularyPlan,
  countWordsInPlan,
} from "@/lib/vocabulary-generation";
import type { CreatePlanRequest } from "@/lib/vocabulary-types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePlanRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.childId || !body.learningLanguage || !body.weeksRequested) {
    return NextResponse.json(
      { error: "childId, learningLanguage, and weeksRequested are required" },
      { status: 400 }
    );
  }

  if (body.weeksRequested < 1 || body.weeksRequested > 4) {
    return NextResponse.json(
      { error: "weeksRequested must be between 1 and 4" },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(body.childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // Check no active/approved plan exists for this child+language
  const existing = await db
    .select({ id: vocabularyPlans.id })
    .from(vocabularyPlans)
    .where(
      and(
        eq(vocabularyPlans.childId, body.childId),
        eq(vocabularyPlans.learningLanguage, body.learningLanguage),
        inArray(vocabularyPlans.status, ["active", "approved"])
      )
    );

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error:
          "An active plan already exists for this child and language. Complete or cancel it first.",
      },
      { status: 409 }
    );
  }

  const age = calculateAge(child.dateOfBirth);
  const creditsCost = estimateVocabularyCost(body.weeksRequested, age);

  // Generate plan via AI
  const result = await generateVocabularyPlan({
    childName: child.name,
    childAge: age,
    interests: child.interests,
    nativeLanguage: child.nativeLanguage,
    learningLanguage: body.learningLanguage,
    weeksRequested: body.weeksRequested,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  // Calculate next Monday as week start date
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const weekStartDate = nextMonday.toISOString().split("T")[0];

  const wordsTotal = countWordsInPlan(result.data.plan);

  const [plan] = await db
    .insert(vocabularyPlans)
    .values({
      childId: body.childId,
      userId: session.user.id,
      learningLanguage: body.learningLanguage,
      nativeLanguage: child.nativeLanguage,
      weekStartDate,
      weeksRequested: body.weeksRequested,
      status: "draft",
      creditsCost,
      wordsTotal,
      wordsAudioReady: 0,
      plan: result.data.plan,
    })
    .returning();

  return NextResponse.json(plan, { status: 201 });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");

  if (!childId) {
    return NextResponse.json(
      { error: "childId is required" },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const plans = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.childId, childId))
    .orderBy(desc(vocabularyPlans.createdAt));

  return NextResponse.json(plans);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/vocabulary/plans/route.ts
git commit -m "feat(vocab): add create and list vocabulary plans API"
```

---

## Task 6: API — Plan Details, Approve, Regenerate, Cancel

**Files:**
- Create: `src/app/api/vocabulary/plans/[planId]/route.ts`
- Create: `src/app/api/vocabulary/plans/[planId]/approve/route.ts`
- Create: `src/app/api/vocabulary/plans/[planId]/regenerate/route.ts`
- Create: `src/app/api/vocabulary/plans/[planId]/cancel/route.ts`

- [ ] **Step 1: Create plan details route**

```ts
// src/app/api/vocabulary/plans/[planId]/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans, vocabularyWords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const words = await db
    .select()
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  return NextResponse.json({ ...plan, words });
}
```

- [ ] **Step 2: Create approve route**

```ts
// src/app/api/vocabulary/plans/[planId]/approve/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  vocabularyPlans,
  vocabularyWords,
} from "@/lib/db/schema";
import { user, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setCache } from "@/lib/tts-cache";

// Voice mapping per native language
const VOICE_MAP: Record<string, string> = {
  vi: "shimmer",
  en: "nova",
  de: "onyx",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft plans can be approved" },
      { status: 400 }
    );
  }

  // Atomic credit deduction + word insertion in a transaction
  let insertedWords: Array<typeof vocabularyWords.$inferSelect>;

  try {
    insertedWords = await db.transaction(async (tx) => {
      // Check credit balance inside transaction for atomicity
      const [currentUser] = await tx
        .select({ credits: user.credits })
        .from(user)
        .where(eq(user.id, session.user.id));

      if (currentUser.credits < plan.creditsCost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      // Deduct credits
      const newBalance = currentUser.credits - plan.creditsCost;
      await tx
        .update(user)
        .set({ credits: newBalance })
        .where(eq(user.id, session.user.id));

      await tx.insert(creditTransactions).values({
        user_id: session.user.id,
        amount: -plan.creditsCost,
        balance_after: newBalance,
        type: "vocabulary_plan",
        description: `Vocabulary plan (${plan.weeksRequested} week${plan.weeksRequested > 1 ? "s" : ""})`,
        metadata: { planId: plan.id, childId: plan.childId },
      });

      // Insert word rows from plan JSON
      const wordRows: Array<{
        planId: string;
        word: string;
        topic: string;
        day: number;
        weekNumber: number;
        promptSentence: string;
        pronunciation: string;
        emoji: string;
      }> = [];

      for (const week of plan.plan.weeks) {
        for (const day of week.days) {
          for (const w of day.words) {
            wordRows.push({
              planId: plan.id,
              word: w.word,
              topic: day.topic,
              day: day.day,
              weekNumber: week.weekNumber,
              promptSentence: w.promptSentence,
              pronunciation: w.pronunciation,
              emoji: w.emoji,
            });
          }
        }
      }

      const words = await tx
        .insert(vocabularyWords)
        .values(wordRows)
        .returning();

      // Update plan status to approved
      await tx
        .update(vocabularyPlans)
        .set({ status: "approved", updatedAt: new Date().toISOString() })
        .where(eq(vocabularyPlans.id, planId));

      return words;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }
    throw err;
  }

  // Trigger TTS generation in background (non-blocking, outside transaction)
  generateAllAudio(plan, insertedWords).catch(console.error);

  return NextResponse.json({ ok: true, status: "approved" });
}

async function generateAllAudio(
  plan: typeof vocabularyPlans.$inferSelect,
  words: Array<typeof vocabularyWords.$inferSelect>
) {
  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  if (!AI_BASE_URL || !AI_API_KEY) return;

  // Voice matched to native language (prompt sentences are in native language)
  const voice = VOICE_MAP[plan.nativeLanguage] || "nova";
  const ttlMs = (plan.weeksRequested * 7 + 14) * 24 * 60 * 60 * 1000;

  let audioReadyCount = 0;
  let failedCount = 0;

  for (const word of words) {
    let success = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ttsResponse = await fetch(`${AI_BASE_URL}/audio/speech`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "tts-1",
            input: word.promptSentence,
            voice,
            response_format: "mp3",
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!ttsResponse.ok) {
          if (attempt < 2) {
            await new Promise((r) =>
              setTimeout(r, 1000 * Math.pow(2, attempt))
            );
            continue;
          }
          break;
        }

        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        await setCache(word.promptSentence, voice, audioBuffer, ttlMs);

        // Store the SHA-256 cache key (matches how tts-cache.ts computes keys)
        const { createHash } = await import("crypto");
        const cacheKey = createHash("sha256")
          .update(`${voice}:${word.promptSentence}`)
          .digest("hex");
        await db
          .update(vocabularyWords)
          .set({
            audioUrl: cacheKey,
            audioGeneratedAt: new Date().toISOString(),
          })
          .where(eq(vocabularyWords.id, word.id));

        audioReadyCount++;
        success = true;
        break;
      } catch {
        if (attempt < 2) {
          await new Promise((r) =>
            setTimeout(r, 1000 * Math.pow(2, attempt))
          );
        }
      }
    }

    if (!success) failedCount++;

    // Update counter on plan
    await db
      .update(vocabularyPlans)
      .set({
        wordsAudioReady: audioReadyCount,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(vocabularyPlans.id, plan.id));
  }

  // Transition plan status
  if (failedCount === words.length) {
    await db
      .update(vocabularyPlans)
      .set({ status: "failed", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, plan.id));
  } else {
    await db
      .update(vocabularyPlans)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, plan.id));
  }
}
```

- [ ] **Step 3: Create regenerate route**

```ts
// src/app/api/vocabulary/plans/[planId]/regenerate/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { user, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { estimateVocabularyCost } from "@/lib/vocabulary-credits";
import {
  generateVocabularyPlan,
  countWordsInPlan,
} from "@/lib/vocabulary-generation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft plans can be regenerated" },
      { status: 400 }
    );
  }

  // Enforce max 3 regenerations — count regen transactions for this planId
  const regenTxns = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "vocabulary_plan_regen"));
  const regenCount = regenTxns.filter(
    (tx) => (tx.metadata as any)?.planId === planId
  ).length;

  if (regenCount >= 3) {
    // Auto-cancel plan after max regenerations
    await db
      .update(vocabularyPlans)
      .set({ status: "cancelled", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, planId));
    return NextResponse.json(
      { error: "Maximum regenerations (3) reached. Plan has been cancelled." },
      { status: 400 }
    );
  }

  const child = await verifyChildOwnership(plan.childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const age = calculateAge(child.dateOfBirth);
  const creditsCost = estimateVocabularyCost(plan.weeksRequested, age);

  // Check credits
  const [currentUser] = await db
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, session.user.id));

  if (currentUser.credits < creditsCost) {
    return NextResponse.json(
      { error: "Insufficient credits" },
      { status: 402 }
    );
  }

  // Deduct credits for regeneration
  const newBalance = currentUser.credits - creditsCost;
  await db
    .update(user)
    .set({ credits: newBalance })
    .where(eq(user.id, session.user.id));

  await db.insert(creditTransactions).values({
    user_id: session.user.id,
    amount: -creditsCost,
    balance_after: newBalance,
    type: "vocabulary_plan_regen",
    description: `Vocabulary plan regeneration`,
    metadata: { planId: plan.id },
  });

  // Regenerate
  const result = await generateVocabularyPlan({
    childName: child.name,
    childAge: age,
    interests: child.interests,
    nativeLanguage: child.nativeLanguage,
    learningLanguage: plan.learningLanguage,
    weeksRequested: plan.weeksRequested,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const wordsTotal = countWordsInPlan(result.data.plan);

  const [updated] = await db
    .update(vocabularyPlans)
    .set({
      plan: result.data.plan,
      wordsTotal,
      // creditsCost stays as the original approval cost (used for refunds).
      // Regen costs are tracked separately in creditTransactions.
      updatedAt: new Date().toISOString(),
    })
    .where(eq(vocabularyPlans.id, planId))
    .returning();

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Create cancel route**

```ts
// src/app/api/vocabulary/plans/[planId]/cancel/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { user, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.id, planId));

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.status === "completed" || plan.status === "cancelled") {
    return NextResponse.json(
      { error: "Plan is already " + plan.status },
      { status: 400 }
    );
  }

  // Refund if plan failed
  if (plan.status === "failed") {
    const [currentUser] = await db
      .select({ credits: user.credits })
      .from(user)
      .where(eq(user.id, session.user.id));

    const newBalance = currentUser.credits + plan.creditsCost;
    await db
      .update(user)
      .set({ credits: newBalance })
      .where(eq(user.id, session.user.id));

    await db.insert(creditTransactions).values({
      user_id: session.user.id,
      amount: plan.creditsCost,
      balance_after: newBalance,
      type: "vocabulary_refund",
      description: "Vocabulary plan refund (generation failed)",
      metadata: { planId: plan.id },
    });
  }

  // Draft plans: delete (no credits were charged)
  if (plan.status === "draft") {
    await db
      .delete(vocabularyPlans)
      .where(eq(vocabularyPlans.id, planId));
    return NextResponse.json({ ok: true, deleted: true });
  }

  // Approved/active plans: cancel, no refund
  await db
    .update(vocabularyPlans)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(eq(vocabularyPlans.id, planId));

  return NextResponse.json({ ok: true, refunded: plan.status === "failed" });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/vocabulary/plans/
git commit -m "feat(vocab): add plan details, approve, regenerate, and cancel API routes"
```

---

## Task 7: API — Progress Tracking

**Files:**
- Create: `src/app/api/vocabulary/progress/route.ts`
- Create: `src/app/api/vocabulary/progress/[planId]/route.ts`

- [ ] **Step 1: Create progress recording route**

```ts
// src/app/api/vocabulary/progress/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";
import type { RecordProgressRequest } from "@/lib/vocabulary-types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RecordProgressRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.wordId || !body.planId || !body.childId || !body.type) {
    return NextResponse.json(
      { error: "wordId, planId, childId, and type are required" },
      { status: 400 }
    );
  }

  // Verify parent owns this child
  const child = await verifyChildOwnership(body.childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Upsert progress
  const [existing] = await db
    .select()
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.childId, body.childId),
        eq(vocabularyProgress.wordId, body.wordId)
      )
    );

  if (body.type === "listened") {
    if (existing) {
      await db
        .update(vocabularyProgress)
        .set({
          listened: true,
          listenedAt: new Date().toISOString(),
        })
        .where(eq(vocabularyProgress.id, existing.id));
    } else {
      await db.insert(vocabularyProgress).values({
        childId: body.childId,
        wordId: body.wordId,
        planId: body.planId,
        listened: true,
        listenedAt: new Date().toISOString(),
      });
    }
  } else if (body.type === "quiz") {
    const quizCorrect = body.quizCorrect ?? false;
    if (existing) {
      await db
        .update(vocabularyProgress)
        .set({
          quizCorrect,
          quizAttempts: existing.quizAttempts + 1,
          quizzedAt: new Date().toISOString(),
        })
        .where(eq(vocabularyProgress.id, existing.id));
    } else {
      await db.insert(vocabularyProgress).values({
        childId: body.childId,
        wordId: body.wordId,
        planId: body.planId,
        quizCorrect,
        quizAttempts: 1,
        quizzedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create progress retrieval route**

```ts
// src/app/api/vocabulary/progress/[planId]/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");

  if (!childId) {
    return NextResponse.json(
      { error: "childId is required" },
      { status: 400 }
    );
  }

  // Verify parent owns this child
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const progress = await db
    .select()
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.planId, planId),
        eq(vocabularyProgress.childId, childId)
      )
    );

  return NextResponse.json(progress);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/vocabulary/progress/
git commit -m "feat(vocab): add vocabulary progress recording and retrieval API"
```

---

## Task 8: Parent UI — Create Plan Dialog

**Files:**
- Create: `src/components/vocabulary/create-plan-dialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// src/components/vocabulary/create-plan-dialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  de: "German",
};

interface CreatePlanDialogProps {
  childId: string;
  childAge: number;
  learningLanguages: string[];
  onCreated: () => void;
}

export function CreatePlanDialog({
  childId,
  childAge,
  learningLanguages,
  onCreated,
}: CreatePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(learningLanguages[0] || "en");
  const [weeks, setWeeks] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credit estimate
  const wordsPerWeek = childAge <= 6 ? 25 : childAge <= 9 ? 35 : 45;
  const estimatedCost = Math.round(
    3 + wordsPerWeek * Number(weeks) * 0.15
  );

  async function handleCreate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vocabulary/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          learningLanguage: language,
          weeksRequested: Number(weeks),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create plan");
        return;
      }

      setOpen(false);
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Vocabulary Plan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Vocabulary Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Learning Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {learningLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang] || lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Number of Weeks</Label>
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {w} week{w > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>
              Estimated cost: <strong>{estimatedCost} credits</strong>
            </p>
            <p className="text-muted-foreground">
              Credits are charged when you approve the plan.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Generating plan..." : "Generate Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vocabulary/create-plan-dialog.tsx
git commit -m "feat(vocab): add create vocabulary plan dialog component"
```

---

## Task 9: Parent UI — Plan Review

**Files:**
- Create: `src/components/vocabulary/plan-review.tsx`

- [ ] **Step 1: Create the plan review component**

```tsx
// src/components/vocabulary/plan-review.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VocabularyPlan } from "@/lib/vocabulary-types";

interface PlanReviewProps {
  planId: string;
  plan: VocabularyPlan;
  creditsCost: number;
  status: string;
  onApproved: () => void;
  onRegenerated: () => void;
}

export function PlanReview({
  planId,
  plan,
  creditsCost,
  status,
  onApproved,
  onRegenerated,
}: PlanReviewProps) {
  const [loading, setLoading] = useState<"approve" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const res = await fetch(`/api/vocabulary/plans/${planId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to approve");
        return;
      }
      onApproved();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerate() {
    if (
      !confirm(
        `Regenerating will cost additional credits. Continue?`
      )
    )
      return;

    setLoading("regenerate");
    setError(null);
    try {
      const res = await fetch(
        `/api/vocabulary/plans/${planId}/regenerate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to regenerate");
        return;
      }
      onRegenerated();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {plan.weeks.map((week) => (
        <div key={week.weekNumber} className="space-y-3">
          <h3 className="font-bold text-lg">Week {week.weekNumber}</h3>
          <div className="space-y-2">
            {week.days.map((day) => (
              <div
                key={`${week.weekNumber}-${day.day}`}
                className="rounded-xl bg-card p-4 storybook-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">
                    Day {day.day}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span>{day.topic}</span>
                  {day.isReview && (
                    <Badge variant="secondary">Review</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {day.words.map((w) => (
                    <span
                      key={w.word}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                    >
                      {w.emoji} {w.word}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {status === "draft" && (
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={loading !== null}
          >
            {loading === "approve"
              ? "Approving..."
              : `Approve (${creditsCost} credits)`}
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={loading !== null}
          >
            {loading === "regenerate" ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      )}

      {status === "approved" && (
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="font-semibold">Preparing audio...</p>
          <p className="text-sm text-muted-foreground">
            The plan will be ready for your child shortly.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vocabulary/plan-review.tsx
git commit -m "feat(vocab): add plan review component for parent approval flow"
```

---

## Task 10: Parent UI — Plan Progress Card

**Files:**
- Create: `src/components/vocabulary/plan-progress.tsx`

- [ ] **Step 1: Create the progress card component**

```tsx
// src/components/vocabulary/plan-progress.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VocabularyPlan } from "@/lib/vocabulary-types";

interface PlanProgressProps {
  planId: string;
  plan: VocabularyPlan;
  status: string;
  weekStartDate: string;
  wordsTotal: number;
  wordsListened: number;
  quizAccuracy: number | null;
  onCancel: () => void;
}

function getCurrentDay(weekStartDate: string): {
  weekNumber: number;
  day: number;
} {
  const start = new Date(weekStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  const day = (diffDays % 7) + 1;
  return { weekNumber, day };
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  approved: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  draft: "bg-purple-100 text-purple-800",
};

export function PlanProgress({
  planId,
  plan,
  status,
  weekStartDate,
  wordsTotal,
  wordsListened,
  quizAccuracy,
  onCancel,
}: PlanProgressProps) {
  const current = getCurrentDay(weekStartDate);
  const progressPercent =
    wordsTotal > 0 ? Math.round((wordsListened / wordsTotal) * 100) : 0;

  // Find today's topic
  const todayTopic = plan.weeks
    .find((w) => w.weekNumber === current.weekNumber)
    ?.days.find((d) => d.day === current.day);

  return (
    <div className="rounded-2xl bg-card p-6 storybook-shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Vocabulary Plan</h3>
        <Badge className={STATUS_COLORS[status] || ""}>
          {status}
        </Badge>
      </div>

      {todayTopic && status === "active" && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm text-muted-foreground">Today's topic</p>
          <p className="font-semibold">
            {todayTopic.words[0]?.emoji} {todayTopic.topic}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>
            {wordsListened}/{wordsTotal} words ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {quizAccuracy !== null && (
        <p className="text-sm text-muted-foreground">
          Quiz accuracy: {Math.round(quizAccuracy * 100)}%
        </p>
      )}

      {(status === "active" || status === "approved" || status === "failed") && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel Plan
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vocabulary/plan-progress.tsx
git commit -m "feat(vocab): add plan progress card for parent dashboard"
```

---

## Task 11: Kid UI — Word List & Word Detail

**Files:**
- Create: `src/components/vocabulary/word-list.tsx`
- Create: `src/components/vocabulary/word-detail.tsx`

- [ ] **Step 1: Create word list component**

```tsx
// src/components/vocabulary/word-list.tsx
"use client";

interface WordItem {
  id: string;
  word: string;
  emoji: string;
  listened: boolean;
}

interface WordListProps {
  words: WordItem[];
  activeWordId: string | null;
  onSelect: (wordId: string) => void;
}

export function WordList({ words, activeWordId, onSelect }: WordListProps) {
  return (
    <div className="flex flex-col gap-2">
      {words.map((w) => (
        <button
          key={w.id}
          onClick={() => onSelect(w.id)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
            activeWordId === w.id
              ? "bg-primary text-primary-foreground storybook-shadow"
              : w.listened
                ? "bg-muted/50 text-muted-foreground"
                : "bg-card hover:bg-muted storybook-shadow"
          }`}
        >
          <span className="text-2xl">{w.emoji}</span>
          <span className="font-bold text-lg">{w.word}</span>
          {w.listened && activeWordId !== w.id && (
            <span className="ml-auto text-green-500">&#x2713;</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create word detail component**

```tsx
// src/components/vocabulary/word-detail.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface WordDetailProps {
  word: {
    id: string;
    word: string;
    emoji: string;
    pronunciation: string;
    promptSentence: string;
  };
  voice: string;
  onListened: (wordId: string) => void;
}

export function WordDetail({ word, voice, onListened }: WordDetailProps) {
  const [audioState, setAudioState] = useState<
    "idle" | "loading" | "playing"
  >("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handlePlay() {
    if (audioState === "playing" && audioRef.current) {
      audioRef.current.pause();
      setAudioState("idle");
      return;
    }

    setAudioState("loading");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word.promptSentence, voice }),
      });

      if (!res.ok) {
        setAudioState("idle");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setAudioState("idle");
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setAudioState("idle");
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setAudioState("playing");
      onListened(word.id);
    } catch {
      setAudioState("idle");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <span className="text-8xl drop-shadow-md animate-fade-up">
        {word.emoji}
      </span>
      <h2 className="text-4xl font-extrabold tracking-tight">
        {word.word}
      </h2>
      <p className="text-lg text-muted-foreground">{word.pronunciation}</p>
      <Button
        size="lg"
        onClick={handlePlay}
        disabled={audioState === "loading"}
        className="h-16 w-16 rounded-full text-2xl"
      >
        {audioState === "loading"
          ? "..."
          : audioState === "playing"
            ? "||"
            : "\u25B6"}
      </Button>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Tap to hear the word. Listen and repeat!
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/vocabulary/word-list.tsx src/components/vocabulary/word-detail.tsx
git commit -m "feat(vocab): add word list and word detail components for kid mode"
```

---

## Task 12: Kid UI — Quick Check Quiz

**Files:**
- Create: `src/components/vocabulary/quick-check.tsx`

- [ ] **Step 1: Create quick check component**

```tsx
// src/components/vocabulary/quick-check.tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface QuizWord {
  id: string;
  word: string;
  emoji: string;
}

interface QuickCheckProps {
  words: QuizWord[];
  choiceCount: number;
  onResult: (wordId: string, correct: boolean, attempts: number) => void;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuickCheck({
  words,
  choiceCount,
  onResult,
  onComplete,
}: QuickCheckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [completed, setCompleted] = useState(false);

  const shuffledWords = useMemo(() => shuffle(words), [words]);
  const current = shuffledWords[currentIndex];

  const options = useMemo(() => {
    if (!current) return [];
    const others = words.filter((w) => w.id !== current.id);
    const distractors = shuffle(others).slice(0, choiceCount - 1);
    return shuffle([current, ...distractors]);
  }, [current, words, choiceCount]);

  function handleChoice(chosen: QuizWord) {
    const isCorrect = chosen.id === current.id;
    const newAttempts = attempts + 1;

    if (isCorrect) {
      setFeedback("correct");
      onResult(current.id, true, newAttempts);

      setTimeout(() => {
        setFeedback(null);
        setAttempts(0);
        if (currentIndex + 1 >= shuffledWords.length) {
          setCompleted(true);
          onComplete();
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 1500);
    } else {
      setFeedback("wrong");
      setAttempts(newAttempts);

      if (newAttempts >= 2) {
        onResult(current.id, false, newAttempts);
        setTimeout(() => {
          setFeedback(null);
          setAttempts(0);
          if (currentIndex + 1 >= shuffledWords.length) {
            setCompleted(true);
            onComplete();
          } else {
            setCurrentIndex((i) => i + 1);
          }
        }, 1500);
      } else {
        setTimeout(() => setFeedback(null), 1000);
      }
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <span className="text-6xl">&#x1F389;</span>
        <h2 className="text-2xl font-extrabold">Great job!</h2>
        <p className="text-muted-foreground">
          You finished today's words!
        </p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <p className="text-sm text-muted-foreground">
        {currentIndex + 1} / {shuffledWords.length}
      </p>
      <span className="text-7xl">{current.emoji}</span>

      {feedback === "correct" && (
        <p className="text-xl font-bold text-green-600 animate-fade-up">
          &#x2713; Correct!
        </p>
      )}
      {feedback === "wrong" && (
        <p className="text-xl font-bold text-orange-500 animate-fade-up">
          Try again!
        </p>
      )}

      {feedback !== "correct" && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {options.map((opt) => (
            <Button
              key={opt.id}
              variant="outline"
              size="lg"
              onClick={() => handleChoice(opt)}
              disabled={feedback !== null}
              className="h-14 text-lg font-bold"
            >
              {opt.word}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/vocabulary/quick-check.tsx
git commit -m "feat(vocab): add quick check quiz component for kid mode"
```

---

## Task 13: Kid Mode — Vocabulary Learning Page

**Files:**
- Create: `src/app/dashboard/[childId]/read/vocabulary/[planId]/page.tsx`

- [ ] **Step 1: Create the vocabulary learning page**

```tsx
// src/app/dashboard/[childId]/read/vocabulary/[planId]/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  vocabularyPlans,
  vocabularyWords,
  vocabularyProgress,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyChildOwnership } from "@/lib/children";
import { VocabularyLearningClient } from "./client";

function getCurrentPlanDay(weekStartDate: string): {
  weekNumber: number;
  day: number;
} {
  const start = new Date(weekStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { weekNumber: 1, day: 1 };
  const weekNumber = Math.floor(diffDays / 7) + 1;
  const day = (diffDays % 7) + 1;
  return { weekNumber, day };
}

export default async function VocabularyLearningPage({
  params,
}: {
  params: Promise<{ childId: string; planId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId, planId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const [plan] = await db
    .select()
    .from(vocabularyPlans)
    .where(
      and(
        eq(vocabularyPlans.id, planId),
        eq(vocabularyPlans.childId, childId)
      )
    );

  if (!plan || plan.status !== "active") {
    redirect(`/dashboard/${childId}/read`);
  }

  const words = await db
    .select()
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  const progress = await db
    .select()
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.planId, planId),
        eq(vocabularyProgress.childId, childId)
      )
    );

  const current = getCurrentPlanDay(plan.weekStartDate);

  // Voice mapping
  const voiceMap: Record<string, string> = {
    vi: "shimmer",
    en: "nova",
    de: "onyx",
  };
  const voice = voiceMap[child.nativeLanguage] || "nova";

  return (
    <VocabularyLearningClient
      plan={plan}
      words={words}
      progress={progress}
      currentWeek={current.weekNumber}
      currentDay={current.day}
      childId={childId}
      childName={child.name}
      voice={voice}
      choiceCount={plan.plan.quizOptions.choiceCount}
      backHref={`/dashboard/${childId}/read`}
    />
  );
}
```

- [ ] **Step 2: Create the client component**

Create `src/app/dashboard/[childId]/read/vocabulary/[planId]/client.tsx`:

```tsx
// src/app/dashboard/[childId]/read/vocabulary/[planId]/client.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { VocabularyPlan } from "@/lib/vocabulary-types";
import { WordList } from "@/components/vocabulary/word-list";
import { WordDetail } from "@/components/vocabulary/word-detail";
import { QuickCheck } from "@/components/vocabulary/quick-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VocabPlanRow {
  id: string;
  weekStartDate: string;
  plan: VocabularyPlan;
  [key: string]: unknown;
}

interface VocabWordRow {
  id: string;
  word: string;
  emoji: string;
  pronunciation: string;
  promptSentence: string;
  weekNumber: number;
  day: number;
  topic: string;
  [key: string]: unknown;
}

interface VocabProgressRow {
  wordId: string;
  listened: boolean;
  [key: string]: unknown;
}

interface VocabularyLearningClientProps {
  plan: VocabPlanRow;
  words: VocabWordRow[];
  progress: VocabProgressRow[];
  currentWeek: number;
  currentDay: number;
  childId: string;
  childName: string;
  voice: string;
  choiceCount: number;
  backHref: string;
}

export function VocabularyLearningClient({
  plan,
  words,
  progress,
  currentWeek,
  currentDay,
  childId,
  childName,
  voice,
  choiceCount,
  backHref,
}: VocabularyLearningClientProps) {
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [listenedIds, setListenedIds] = useState<Set<string>>(
    new Set(progress.filter((p) => p.listened).map((p) => p.wordId))
  );

  // Get words for selected day
  const dayWords = words.filter(
    (w) => w.weekNumber === selectedWeek && w.day === selectedDay
  );

  const allListened = dayWords.every((w) => listenedIds.has(w.id));

  const activeWord = dayWords.find((w) => w.id === activeWordId);

  // Build available days (unlocked = calendar date <= today)
  const availableDays: Array<{ week: number; day: number; topic: string }> = [];
  for (const week of plan.plan.weeks) {
    for (const day of week.days) {
      const dayDate = new Date(plan.weekStartDate);
      dayDate.setDate(
        dayDate.getDate() + (week.weekNumber - 1) * 7 + (day.day - 1)
      );
      if (dayDate <= new Date()) {
        availableDays.push({
          week: week.weekNumber,
          day: day.day,
          topic: day.topic,
        });
      }
    }
  }

  const currentTopic =
    plan.plan.weeks
      .find((w: any) => w.weekNumber === selectedWeek)
      ?.days.find((d: any) => d.day === selectedDay)?.topic || "";

  const handleListened = useCallback(
    (wordId: string) => {
      setListenedIds((prev) => new Set(prev).add(wordId));
      fetch("/api/vocabulary/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId,
          planId: plan.id,
          childId,
          type: "listened",
        }),
      }).catch(() => {});
    },
    [plan.id, childId]
  );

  const handleQuizResult = useCallback(
    (wordId: string, correct: boolean, attempts: number) => {
      fetch("/api/vocabulary/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId,
          planId: plan.id,
          childId,
          type: "quiz",
          quizCorrect: correct,
        }),
      }).catch(() => {});
    },
    [plan.id, childId]
  );

  if (showQuiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-parchment">
        <QuickCheck
          words={dayWords.map((w) => ({
            id: w.id,
            word: w.word,
            emoji: w.emoji,
          }))}
          choiceCount={choiceCount}
          onResult={handleQuizResult}
          onComplete={() => {}}
        />
        <Link href={backHref} className="mt-8">
          <Button variant="outline">Back to stories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">{currentTopic}</h1>
          <p className="text-sm text-muted-foreground">
            Week {selectedWeek}, Day {selectedDay}
          </p>
        </div>
        <Badge variant="secondary">
          {listenedIds.size}/{dayWords.length} words
        </Badge>
      </div>

      {/* Day selector */}
      <div className="px-4 pb-4 flex gap-2 overflow-x-auto">
        {availableDays.map((d) => (
          <button
            key={`${d.week}-${d.day}`}
            onClick={() => {
              setSelectedWeek(d.week);
              setSelectedDay(d.day);
              setActiveWordId(null);
              setShowQuiz(false);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition-all ${
              d.week === selectedWeek && d.day === selectedDay
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            W{d.week}D{d.day}
          </button>
        ))}
      </div>

      {/* Split view */}
      <div className="flex flex-col md:flex-row gap-4 px-4">
        {/* Word list - left */}
        <div className="md:w-[30%]">
          <WordList
            words={dayWords.map((w) => ({
              id: w.id,
              word: w.word,
              emoji: w.emoji,
              listened: listenedIds.has(w.id),
            }))}
            activeWordId={activeWordId}
            onSelect={setActiveWordId}
          />

          {allListened && !showQuiz && (
            <Button
              className="w-full mt-4"
              onClick={() => setShowQuiz(true)}
            >
              Let's check!
            </Button>
          )}
        </div>

        {/* Word detail - right */}
        <div className="md:w-[70%] flex items-center justify-center min-h-[400px] rounded-2xl bg-card storybook-shadow">
          {activeWord ? (
            <WordDetail
              word={activeWord}
              voice={voice}
              onListened={handleListened}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <span className="text-5xl block mb-4">&#x1F449;</span>
              <p className="font-semibold">
                {childName}, tap a word to start learning!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* No exit button needed here — the /read layout provides HoldToExitButton in the sticky header */}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/[childId]/read/vocabulary/
git commit -m "feat(vocab): add kid vocabulary learning page with split view and quiz"
```

---

## Task 14: Integrate — Child Dashboard + Reading Hub

**Files:**
- Modify: `src/app/dashboard/[childId]/page.tsx`
- Modify: `src/app/dashboard/[childId]/read/page.tsx`

- [ ] **Step 1: Add vocabulary section to child dashboard**

In `src/app/dashboard/[childId]/page.tsx`, add imports and a vocabulary section. The exact insertion point depends on the current structure — add after the stories grid section. This will be a server component that fetches active vocabulary plans and shows a summary card or create button.

Add these imports at the top:

```ts
import { vocabularyPlans, vocabularyProgress } from "@/lib/db/schema";
```

And add a vocabulary section after the stories grid (the exact code will depend on reading the full page at implementation time — the subagent should read the file and find the right insertion point).

The section should:
- Fetch active vocabulary plans for this child
- If a plan exists: show the PlanProgress component (client boundary needed)
- If no plan: show a CreatePlanDialog button
- Include a link to view/review draft plans

- [ ] **Step 2: Add "Today's Words" to kid reading hub**

In `src/app/dashboard/[childId]/read/page.tsx`, add a section above the stories grid that shows today's vocabulary topic if an active plan exists.

Add import:

```ts
import { vocabularyPlans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
```

After the child ownership check, fetch the active vocabulary plan:

```ts
const [activePlan] = await db
  .select()
  .from(vocabularyPlans)
  .where(
    and(
      eq(vocabularyPlans.childId, childId),
      eq(vocabularyPlans.status, "active")
    )
  );
```

Then add a "Today's Words" card above the stories grid linking to `/dashboard/${childId}/read/vocabulary/${activePlan.id}`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/[childId]/page.tsx src/app/dashboard/[childId]/read/page.tsx
git commit -m "feat(vocab): integrate vocabulary into child dashboard and reading hub"
```

---

## Task 15: Plan Completion Logic

**Files:**
- Modify: `src/app/api/vocabulary/progress/route.ts` (add completion check after quiz result)
- Create: `src/lib/vocabulary-utils.ts` (shared utility for day mapping)

- [ ] **Step 1: Create shared vocabulary utilities**

Extract the duplicated `getCurrentPlanDay` function into a shared module:

```ts
// src/lib/vocabulary-utils.ts

export function getCurrentPlanDay(weekStartDate: string): {
  weekNumber: number;
  day: number;
} {
  const start = new Date(weekStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { weekNumber: 1, day: 1 };
  const weekNumber = Math.floor(diffDays / 7) + 1;
  const day = (diffDays % 7) + 1;
  return { weekNumber, day };
}

/**
 * Check if a plan should transition to 'completed'.
 * Completes when all days have their quick checks done.
 */
export async function checkPlanCompletion(
  planId: string,
  db: any
): Promise<boolean> {
  const { vocabularyWords, vocabularyProgress, vocabularyPlans } = await import("@/lib/db/schema");
  const { eq, and, isNotNull } = await import("drizzle-orm");

  // Count total words in plan
  const allWords = await db
    .select({ id: vocabularyWords.id })
    .from(vocabularyWords)
    .where(eq(vocabularyWords.planId, planId));

  // Count words with quiz results
  const quizzedWords = await db
    .select({ id: vocabularyProgress.id })
    .from(vocabularyProgress)
    .where(
      and(
        eq(vocabularyProgress.planId, planId),
        isNotNull(vocabularyProgress.quizzedAt)
      )
    );

  if (allWords.length > 0 && quizzedWords.length >= allWords.length) {
    await db
      .update(vocabularyPlans)
      .set({ status: "completed", updatedAt: new Date().toISOString() })
      .where(eq(vocabularyPlans.id, planId));
    return true;
  }

  return false;
}
```

- [ ] **Step 2: Add completion check to progress POST route**

In `src/app/api/vocabulary/progress/route.ts`, after recording a quiz result, call `checkPlanCompletion`:

```ts
import { checkPlanCompletion } from "@/lib/vocabulary-utils";

// ... after the quiz upsert block:
if (body.type === "quiz") {
  // ... existing quiz upsert code ...

  // Check if plan should transition to completed
  await checkPlanCompletion(body.planId, db);
}
```

- [ ] **Step 3: Update Task 10 and Task 13 to import from shared utils**

Replace the inline `getCurrentDay` / `getCurrentPlanDay` functions in `plan-progress.tsx` and the vocabulary learning page with:

```ts
import { getCurrentPlanDay } from "@/lib/vocabulary-utils";
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/vocabulary-utils.ts src/app/api/vocabulary/progress/route.ts
git commit -m "feat(vocab): add plan completion logic and shared vocabulary utilities"
```

---

## Task 16: Database Push & Manual Smoke Test

- [ ] **Step 1: Push schema changes**

Run in user terminal: `! npm run db:push`

- [ ] **Step 2: Start dev server and verify**

Run: `lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1; rm -rf .next; npx next dev -p 3000`

- [ ] **Step 3: Verify no build errors**

Check the terminal output for TypeScript or import errors. Fix any issues.

- [ ] **Step 4: Commit any fixes**

Stage only the vocabulary-related files that were fixed, then commit:

```bash
git add src/lib/ src/app/api/vocabulary/ src/app/dashboard/ src/components/vocabulary/
git commit -m "fix(vocab): resolve build issues from integration"
```

---

## Summary of Commits

| # | Message |
|---|---------|
| 1 | `feat(vocab): add vocabulary plans, words, and progress tables` |
| 2 | `feat(vocab): add vocabulary TypeScript interfaces` |
| 3 | `feat(vocab): add vocabulary credit cost calculation` |
| 4 | `feat(vocab): add AI vocabulary plan generation with prompt builder and validation` |
| 5 | `feat(vocab): add create and list vocabulary plans API` |
| 6 | `feat(vocab): add plan details, approve, regenerate, and cancel API routes` |
| 7 | `feat(vocab): add vocabulary progress recording and retrieval API` |
| 8 | `feat(vocab): add create vocabulary plan dialog component` |
| 9 | `feat(vocab): add plan review component for parent approval flow` |
| 10 | `feat(vocab): add plan progress card for parent dashboard` |
| 11 | `feat(vocab): add word list and word detail components for kid mode` |
| 12 | `feat(vocab): add quick check quiz component for kid mode` |
| 13 | `feat(vocab): add kid vocabulary learning page with split view and quiz` |
| 14 | `feat(vocab): integrate vocabulary into child dashboard and reading hub` |
| 15 | `feat(vocab): add plan completion logic and shared vocabulary utilities` |
| 16 | `fix(vocab): resolve build issues from integration` |
