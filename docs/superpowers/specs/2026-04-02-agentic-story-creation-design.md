# Agentic Story Creation Mode

## Overview

Add an AI-powered story generation mode to the admin story creation page. Admins enter a target keyword and generation parameters, an LLM generates a complete branching story, and the result is loaded into the existing tree editor for review and editing before saving.

## Configuration

Three server-only environment variables (no `NEXT_PUBLIC_` prefix):

```
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o
```

Read via `process.env` in the API route. Any OpenAI-compatible provider works by changing the base URL and key.

## API Route

### `POST /api/admin/stories/generate`

**File:** `src/app/api/admin/stories/generate/route.ts`

#### Request Body

```typescript
interface GenerateStoryRequest {
  keyword: string;
  audienceAge: "4-8" | "8-12";
  isForChildren: boolean;
  expectedReadingTime: number; // minutes
  difficulty: "easy" | "medium" | "hard";
  minBranches: number;
  maxBranches: number;
}
```

#### Response Body (200)

```typescript
interface GenerateStoryResponse {
  title: string;
  summary: string;
  age_range: string;
  story_tree: StoryTree;
}
```

#### Error Response (400 | 500)

```json
{ "error": "description of what went wrong" }
```

#### Behavior

1. **Validate input:** all fields required, `minBranches <= maxBranches`, `expectedReadingTime > 0`. Return `400` if invalid.
2. **Check config:** verify `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` are set. Return `500` with "AI provider not configured" if missing.
3. **Build prompt:** system message instructs the LLM to output JSON matching:
   ```json
   {
     "title": "string",
     "summary": "string",
     "age_range": "string",
     "story_tree": {
       "start": { "text": "...", "choices": [{ "label": "...", "next": "node_id" }] },
       "node_id": { "text": "...", "choices": [] }
     }
   }
   ```
   The prompt specifies:
   - Story must cover the target keyword naturally
   - Content must be appropriate for the audience age and `isForChildren` flag
   - Difficulty level controls vocabulary and sentence complexity
   - Reading time guides total node count (rough: 1 minute ~= 2-3 nodes)
   - Branch count must fall between min and max parameters
   - Every node ID must be a valid identifier (lowercase, underscores)
   - Must have a `"start"` node
   - Must have at least one ending node (empty choices)
   - Every choice `next` must reference an existing node
4. **Call LLM:** `POST {AI_BASE_URL}/chat/completions` with:
   ```json
   {
     "model": "{AI_MODEL}",
     "messages": [{ "role": "system", "content": "..." }, { "role": "user", "content": "..." }],
     "response_format": { "type": "json_object" },
     "temperature": 0.8,
     "max_tokens": 4096
   }
   ```
   Headers: `Authorization: Bearer {AI_API_KEY}`, `Content-Type: application/json`.
   Use `AbortSignal.timeout(60000)` on the fetch call to enforce a 60-second timeout.
5. **Parse and validate response:**
   - Parse JSON from `choices[0].message.content`
   - Validate: has `"start"` node, all choice `next` targets exist, at least one ending node, node count > 0 and < 200
   - If invalid, return `500` with "AI generated an invalid story structure. Please try again."
6. **Return** the validated `GenerateStoryResponse`.

## UI Changes

### Create Story Page (`src/app/admin/stories/new/page.tsx`)

Add a tab interface using two styled buttons that toggle a `mode` state variable (`"manual"` | `"generate"`). No Tabs component needed — just two buttons with active/inactive styling (e.g., border-bottom highlight on the active one).

- **Manual mode:** renders the existing `StoryForm` component, unchanged.
- **AI Generate mode:** renders a new `GenerateStoryForm` component.

When AI generation succeeds, the page:
1. Stores the generated data in a `generatedData` state variable
2. Merges in defaults for fields the AI doesn't return: `{ ...data, price: 0, cover_image: null }`
3. Switches to Manual mode
4. Passes the merged data as `initialData` to `StoryForm`
5. Uses a React `key` derived from the generated data (e.g., `key={JSON.stringify(generatedData)}`) to force `StoryForm` to re-mount with the new initial values, since its internal state is initialized via `useState`

### Generate Story Form (`src/components/admin/generate-story-form.tsx`)

New component with the following fields:

| Field | Input Type | Default | Validation |
|-------|-----------|---------|------------|
| Keyword | text input | (required) | non-empty |
| Audience Age | select | "4-8" | "4-8" or "8-12" |
| For Children | checkbox | checked | - |
| Expected Reading Time | number (min) | 5 | > 0 |
| Difficulty | select | "medium" | "easy", "medium", "hard" |
| Min Branches | number | 2 | >= 1, <= maxBranches |
| Max Branches | number | 5 | >= minBranches |

**"Generate Story" button:**
- Disabled while loading
- Shows "Generating your story..." during request
- On success: calls `onGenerated(data)` callback to parent
- On error: shows red inline alert below the button with the error message, dismissible

### StoryForm Props

No changes needed. `StoryForm` already accepts optional `initialData` with `price` and `cover_image` fields. The create page merges defaults into the AI response before passing it through. The `key` prop on `StoryForm` forces a re-mount when generated data arrives.

## Type Additions (`src/lib/types.ts`)

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

## File Change Summary

| File | Change |
|------|--------|
| `src/app/api/admin/stories/generate/route.ts` | **New** — generation API route |
| `src/components/admin/generate-story-form.tsx` | **New** — AI parameter form |
| `src/app/admin/stories/new/page.tsx` | **Modified** — add tab interface, handle generated data |
| `src/lib/types.ts` | **Modified** — add request/response types |

No changes to: `story-form.tsx`, `tree-editor.tsx`, save API routes, database schema.

No new npm dependencies. Uses native `fetch` for the LLM call.

## Notes

- Generated nodes will not include the optional `image` field from `StoryNode`. This is intentional — image generation is out of scope.
- The `image` field on `StoryNode` is preserved for manually-added images in the tree editor.

## Out of Scope

- Streaming/progress updates (future enhancement)
- AI generation on the edit page (only on create for now)
- Cover image generation
- Admin settings page for AI config (env vars only)
- Retry logic (admin clicks Generate again manually)
- Authentication on admin API routes (existing gap across all admin routes, not introduced by this feature)
