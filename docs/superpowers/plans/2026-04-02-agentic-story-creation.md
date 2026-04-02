# Agentic Story Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-powered story generation mode to the admin create page, where an LLM generates a complete branching story from a keyword and parameters, then loads it into the existing tree editor for review.

**Architecture:** A new API route (`/api/admin/stories/generate`) calls an OpenAI-compatible LLM via native `fetch`, validates the JSON response against the `StoryTree` schema, and returns it. The create page adds a Manual/AI Generate mode toggle; the generated story pre-fills the existing `StoryForm` for editing before save.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui (base-ui), native `fetch` (no new dependencies)

**Spec:** `docs/superpowers/specs/2026-04-02-agentic-story-creation-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `src/lib/types.ts` | Modify | Add `GenerateStoryRequest` and `GenerateStoryResponse` types |
| `src/app/api/admin/stories/generate/route.ts` | Create | API route: validate input, build prompt, call LLM, validate output |
| `src/components/admin/generate-story-form.tsx` | Create | Form for AI generation parameters + submit logic |
| `src/app/admin/stories/new/page.tsx` | Modify | Add Manual/Generate mode toggle, wire generated data into StoryForm |

---

### Task 1: Add Types

**Files:**
- Modify: `src/lib/types.ts:36` (append after `UserStory` interface)

- [ ] **Step 1: Add the generation request and response types**

Append to the end of `src/lib/types.ts`:

```typescript
export interface GenerateStoryRequest {
  keyword: string;
  audienceAge: "4-8" | "8-12";
  isForChildren: boolean;
  expectedReadingTime: number;
  difficulty: "easy" | "medium" | "hard";
  minBranches: number;
  maxBranches: number;
}

export interface GenerateStoryResponse {
  title: string;
  summary: string;
  age_range: string;
  story_tree: StoryTree;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx next build 2>&1 | tail -20` (or verify via dev server — Next.js handles TS compilation)
Expected: No errors related to the new types.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add GenerateStoryRequest and GenerateStoryResponse types"
```

---

### Task 2: Create the Generation API Route

**Files:**
- Create: `src/app/api/admin/stories/generate/route.ts`

**Reference:** Existing API route pattern at `src/app/api/admin/stories/route.ts`

- [ ] **Step 1: Create the route file with input validation**

Create `src/app/api/admin/stories/generate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import type { GenerateStoryRequest, StoryTree } from "@/lib/types";

function validateRequest(body: unknown): { valid: true; data: GenerateStoryRequest } | { valid: false; error: string } {
  const b = body as Record<string, unknown>;

  if (!b.keyword || typeof b.keyword !== "string" || b.keyword.trim() === "") {
    return { valid: false, error: "keyword is required" };
  }
  if (b.audienceAge !== "4-8" && b.audienceAge !== "8-12") {
    return { valid: false, error: "audienceAge must be '4-8' or '8-12'" };
  }
  if (typeof b.isForChildren !== "boolean") {
    return { valid: false, error: "isForChildren must be a boolean" };
  }
  if (typeof b.expectedReadingTime !== "number" || b.expectedReadingTime <= 0) {
    return { valid: false, error: "expectedReadingTime must be a positive number" };
  }
  if (b.difficulty !== "easy" && b.difficulty !== "medium" && b.difficulty !== "hard") {
    return { valid: false, error: "difficulty must be 'easy', 'medium', or 'hard'" };
  }
  if (typeof b.minBranches !== "number" || b.minBranches < 1) {
    return { valid: false, error: "minBranches must be at least 1" };
  }
  if (typeof b.maxBranches !== "number" || b.maxBranches < b.minBranches) {
    return { valid: false, error: "maxBranches must be >= minBranches" };
  }

  return { valid: true, data: b as unknown as GenerateStoryRequest };
}

function validateStoryTree(tree: unknown): tree is StoryTree {
  if (typeof tree !== "object" || tree === null || Array.isArray(tree)) return false;
  const t = tree as Record<string, unknown>;

  if (!("start" in t)) return false;

  const nodeIds = Object.keys(t);
  if (nodeIds.length === 0 || nodeIds.length > 200) return false;

  let hasEnding = false;

  for (const nodeId of nodeIds) {
    const node = t[nodeId] as Record<string, unknown>;
    if (typeof node.text !== "string") return false;
    if (!Array.isArray(node.choices)) return false;

    if (node.choices.length === 0) {
      hasEnding = true;
      continue;
    }

    for (const choice of node.choices) {
      const c = choice as Record<string, unknown>;
      if (typeof c.label !== "string") return false;
      if (typeof c.next !== "string") return false;
      if (!t[c.next]) return false;
    }
  }

  return hasEnding;
}

function buildPrompt(req: GenerateStoryRequest): { system: string; user: string } {
  const nodeCount = req.expectedReadingTime * 3;

  const system = `You are a children's story writer. You create interactive branching stories in JSON format.

Output ONLY valid JSON matching this exact schema:
{
  "title": "string - a compelling story title",
  "summary": "string - a 1-2 sentence summary of the story",
  "age_range": "${req.audienceAge}",
  "story_tree": {
    "start": { "text": "string - opening paragraph", "choices": [{ "label": "string - choice button text", "next": "node_id" }] },
    "node_id": { "text": "string - story paragraph", "choices": [] }
  }
}

Rules:
- The story_tree MUST have a "start" node as the entry point
- Node IDs must be lowercase with underscores (e.g., "explore_cave", "talk_to_wizard")
- Every choice "next" value must reference an existing node ID
- Ending nodes have an empty choices array: "choices": []
- There must be at least one ending node
- Target approximately ${nodeCount} total nodes
- Include between ${req.minBranches} and ${req.maxBranches} branching points (nodes with 2+ choices)
- Each choice should lead to meaningfully different story paths
- ${req.isForChildren ? "Content must be safe and appropriate for children" : "Content should be appropriate for the target age group"}
- Difficulty "${req.difficulty}" means: ${req.difficulty === "easy" ? "simple vocabulary, short sentences, straightforward plot" : req.difficulty === "medium" ? "moderate vocabulary, varied sentence length, some complexity" : "rich vocabulary, complex sentences, nuanced plot"}`;

  const user = `Create an interactive branching story about "${req.keyword}" for readers aged ${req.audienceAge}. Expected reading time: ${req.expectedReadingTime} minutes. Difficulty: ${req.difficulty}. Branches: ${req.minBranches}-${req.maxBranches}.`;

  return { system, user };
}

export async function POST(request: Request) {
  const AI_BASE_URL = process.env.AI_BASE_URL;
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL;

  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    return NextResponse.json(
      { error: "AI provider not configured. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL environment variables." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { system, user } = buildPrompt(validation.data);

  let llmResponse: Response;
  try {
    llmResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
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
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    const message = err instanceof Error && err.name === "TimeoutError"
      ? "AI request timed out after 60 seconds. Please try again."
      : "Failed to connect to AI provider.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!llmResponse.ok) {
    const text = await llmResponse.text().catch(() => "unknown error");
    return NextResponse.json(
      { error: `AI provider returned ${llmResponse.status}: ${text}` },
      { status: 500 }
    );
  }

  let result: { title: string; summary: string; age_range: string; story_tree: StoryTree };
  try {
    const json = await llmResponse.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 500 });
    }
    result = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON." }, { status: 500 });
  }

  if (typeof result.title !== "string" || typeof result.summary !== "string") {
    return NextResponse.json({ error: "AI response missing title or summary." }, { status: 500 });
  }

  if (!validateStoryTree(result.story_tree)) {
    return NextResponse.json(
      { error: "AI generated an invalid story structure. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    title: result.title,
    summary: result.summary,
    age_range: result.age_range || validation.data.audienceAge,
    story_tree: result.story_tree,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/stories/generate/route.ts
git commit -m "feat: add story generation API route"
```

---

### Task 3: Create the Generate Story Form Component

**Files:**
- Create: `src/components/admin/generate-story-form.tsx`

**Reference:** Follow the pattern from `src/components/admin/story-form.tsx` for imports and shadcn/ui usage. Available components: `Input`, `Label`, `Button`, `Select/SelectTrigger/SelectValue/SelectContent/SelectItem`.

- [ ] **Step 1: Create the form component**

Create `src/components/admin/generate-story-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GenerateStoryResponse } from "@/lib/types";

interface GenerateStoryFormProps {
  onGenerated: (data: GenerateStoryResponse) => void;
}

export function GenerateStoryForm({ onGenerated }: GenerateStoryFormProps) {
  const [keyword, setKeyword] = useState("");
  const [audienceAge, setAudienceAge] = useState<"4-8" | "8-12">("4-8");
  const [isForChildren, setIsForChildren] = useState(true);
  const [expectedReadingTime, setExpectedReadingTime] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [minBranches, setMinBranches] = useState(2);
  const [maxBranches, setMaxBranches] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          audienceAge,
          isForChildren,
          expectedReadingTime,
          difficulty,
          minBranches,
          maxBranches,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const data: GenerateStoryResponse = await res.json();
      onGenerated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="keyword">Target Keyword</Label>
        <Input
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g., dragons, space exploration, friendship"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-age-range">Audience Age</Label>
        <Select value={audienceAge} onValueChange={(v: string | null) => setAudienceAge((v as "4-8" | "8-12") ?? "4-8")}>
          <SelectTrigger id="gen-age-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4-8">4-8</SelectItem>
            <SelectItem value="8-12">8-12</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is-for-children"
          type="checkbox"
          checked={isForChildren}
          onChange={(e) => setIsForChildren(e.target.checked)}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor="is-for-children">Content safe for children</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-time">Expected Reading Time (minutes)</Label>
        <Input
          id="reading-time"
          type="number"
          min={1}
          value={expectedReadingTime}
          onChange={(e) => setExpectedReadingTime(Math.max(1, Number(e.target.value)))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-difficulty">Difficulty</Label>
        <Select value={difficulty} onValueChange={(v: string | null) => setDifficulty((v as "easy" | "medium" | "hard") ?? "medium")}>
          <SelectTrigger id="gen-difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min-branches">Min Branches</Label>
          <Input
            id="min-branches"
            type="number"
            min={1}
            max={maxBranches}
            value={minBranches}
            onChange={(e) => setMinBranches(Math.max(1, Math.min(maxBranches, Number(e.target.value))))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-branches">Max Branches</Label>
          <Input
            id="max-branches"
            type="number"
            min={minBranches}
            value={maxBranches}
            onChange={(e) => setMaxBranches(Math.max(minBranches, Number(e.target.value)))}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={loading || !keyword.trim()}>
        {loading ? "Generating your story..." : "Generate Story"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/generate-story-form.tsx
git commit -m "feat: add GenerateStoryForm component"
```

---

### Task 4: Add Mode Toggle to the Create Story Page

**Files:**
- Modify: `src/app/admin/stories/new/page.tsx` (full rewrite — currently 30 lines)

**Reference:** The existing page is a simple wrapper around `StoryForm`. We add a mode toggle and wire in `GenerateStoryForm`. When generation succeeds, we merge defaults (`price: 0`, `cover_image: null`) and re-mount `StoryForm` with a `key` prop.

- [ ] **Step 1: Update the create page**

Replace the contents of `src/app/admin/stories/new/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StoryForm } from "@/components/admin/story-form";
import { GenerateStoryForm } from "@/components/admin/generate-story-form";
import type { GenerateStoryResponse } from "@/lib/types";

type Mode = "manual" | "generate";

export default function CreateStoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [generatedData, setGeneratedData] = useState<GenerateStoryResponse | null>(null);

  async function handleSave(data: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
    story_tree: import("@/lib/types").StoryTree;
  }) {
    setSaving(true);
    const res = await fetch("/api/admin/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/admin");
    }
    setSaving(false);
  }

  function handleGenerated(data: GenerateStoryResponse) {
    setGeneratedData(data);
    setMode("manual");
  }

  const initialData = generatedData
    ? {
        title: generatedData.title,
        summary: generatedData.summary,
        age_range: generatedData.age_range,
        price: 0,
        cover_image: null,
        story_tree: generatedData.story_tree,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Create New Story</h1>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode("generate")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "generate"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          AI Generate
        </button>
      </div>

      {mode === "manual" ? (
        <StoryForm
          key={generatedData ? JSON.stringify(generatedData) : "empty"}
          initialData={initialData}
          onSave={handleSave}
          saving={saving}
        />
      ) : (
        <GenerateStoryForm onGenerated={handleGenerated} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 3: Verify the dev server runs**

Run: `npx next build 2>&1 | tail -20` (or `npm run build` if the script exists)
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/stories/new/page.tsx
git commit -m "feat: add Manual/AI Generate mode toggle to create story page"
```

---

### Task 5: Manual Verification

- [ ] **Step 1: Add placeholder env vars for testing**

Create or update `.env.local` with:
```
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=test-key
AI_MODEL=gpt-4o
```

(If the user has a real key, use it. Otherwise this is just to verify the UI renders.)

- [ ] **Step 2: Start the dev server and verify**

Run: `npm run dev`

Open `http://localhost:3000/admin/stories/new` and verify:
1. Two tabs appear: "Manual" and "AI Generate"
2. Manual tab shows the existing story form with tree editor
3. AI Generate tab shows the generation form with all fields
4. Clicking Generate with no keyword shows no action (button disabled)
5. If a real API key is configured, test a full generation and verify the story loads into the tree editor

- [ ] **Step 3: Final commit (if any tweaks needed)**

```bash
git add -A
git commit -m "feat: complete agentic story creation mode"
```
