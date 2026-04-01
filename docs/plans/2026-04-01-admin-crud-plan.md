# Admin Story CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin interface for CRUD operations on branching stories with a visual tree editor using @xyflow/react.

**Architecture:** Admin routes under `/admin` with no auth gate. Server-side API routes use Supabase service role key to bypass RLS for insert/update/delete. The visual tree editor converts between the existing `StoryTree` JSONB format and React Flow nodes/edges.

**Tech Stack:** @xyflow/react, @dagrejs/dagre (auto-layout), existing Next.js + shadcn/ui + Supabase stack

---

### Task 1: Install Dependencies + Add shadcn Components

**Files:**
- Modify: `package.json`

**Step 1: Install @xyflow/react and dagre**

```bash
cd /Users/thanhdq/sources/cursor_event_example
npm install @xyflow/react @dagrejs/dagre
npm install -D @types/dagre
```

**Step 2: Add needed shadcn components**

```bash
npx shadcn@latest add table dialog textarea select dropdown-menu
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: add @xyflow/react, dagre, and shadcn admin components"
```

---

### Task 2: Admin API Routes

**Files:**
- Create: `src/app/api/admin/stories/route.ts`
- Create: `src/app/api/admin/stories/[id]/route.ts`

**Step 1: Create list + create route** `src/app/api/admin/stories/route.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET all stories (for admin list)
export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST create new story
export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("stories")
    .insert({
      title: body.title,
      summary: body.summary,
      age_range: body.age_range,
      price: body.price ?? 0,
      cover_image: body.cover_image ?? null,
      story_tree: body.story_tree,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
```

**Step 2: Create update + delete route** `src/app/api/admin/stories/[id]/route.ts`

```typescript
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// PUT update story
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("stories")
    .update({
      title: body.title,
      summary: body.summary,
      age_range: body.age_range,
      price: body.price ?? 0,
      cover_image: body.cover_image ?? null,
      story_tree: body.story_tree,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE story (cascades to user_stories via FK)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdminClient();

  const { error } = await supabase.from("stories").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add admin CRUD API routes for stories"
```

---

### Task 3: Story Tree Conversion Utilities

**Files:**
- Create: `src/lib/tree-utils.ts`

These functions convert between the `StoryTree` JSONB format and @xyflow/react nodes/edges.

**Step 1: Create conversion utilities**

```typescript
import { type Node, type Edge, Position } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import type { StoryTree, StoryNode } from "./types";

// Data stored in each React Flow node
export interface StoryNodeData {
  nodeId: string;
  text: string;
  choices: { label: string; next: string }[];
  isStart: boolean;
  isEnding: boolean;
  [key: string]: unknown; // required by @xyflow/react Node type
}

// Convert StoryTree JSONB → React Flow nodes + edges
export function storyTreeToFlow(tree: StoryTree): { nodes: Node<StoryNodeData>[]; edges: Edge[] } {
  const nodes: Node<StoryNodeData>[] = [];
  const edges: Edge[] = [];

  Object.entries(tree).forEach(([nodeId, node], index) => {
    nodes.push({
      id: nodeId,
      type: "storyNode",
      position: { x: 0, y: index * 200 }, // will be overridden by auto-layout
      data: {
        nodeId,
        text: node.text,
        choices: node.choices,
        isStart: nodeId === "start",
        isEnding: node.choices.length === 0,
      },
    });

    node.choices.forEach((choice, choiceIndex) => {
      edges.push({
        id: `${nodeId}-${choice.next}-${choiceIndex}`,
        source: nodeId,
        sourceHandle: `choice-${choiceIndex}`,
        target: choice.next,
        label: choice.label,
        type: "smoothstep",
      });
    });
  });

  return autoLayout(nodes, edges);
}

// Convert React Flow nodes + edges → StoryTree JSONB
export function flowToStoryTree(nodes: Node<StoryNodeData>[], edges: Edge[]): StoryTree {
  const tree: StoryTree = {};

  for (const node of nodes) {
    const data = node.data as StoryNodeData;
    const nodeEdges = edges
      .filter((e) => e.source === node.id)
      .sort((a, b) => {
        const aIdx = parseInt(a.sourceHandle?.replace("choice-", "") ?? "0");
        const bIdx = parseInt(b.sourceHandle?.replace("choice-", "") ?? "0");
        return aIdx - bIdx;
      });

    tree[data.nodeId] = {
      text: data.text,
      choices: nodeEdges.map((edge) => ({
        label: (edge.label as string) ?? "Continue",
        next: edge.target,
      })),
    };
  }

  return tree;
}

// Auto-layout nodes using dagre
export function autoLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 280, height: 150 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 140, y: pos.y - 75 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Generate a unique node ID
export function generateNodeId(): string {
  return `node_${Date.now().toString(36)}`;
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add story tree ↔ React Flow conversion utilities"
```

---

### Task 4: Custom Story Node Component

**Files:**
- Create: `src/components/admin/story-node.tsx`

The custom React Flow node that renders each story node in the visual editor.

**Step 1: Create the custom node**

A "use client" component that:
- Shows the node ID as a label at top (bold, small)
- "START" badge for the start node (green), "END" badge for endings (gold)
- Story text preview (truncated to ~60 chars)
- One target Handle at top (Position.Top)
- One source Handle per choice at bottom (Position.Bottom), each with unique id `choice-{index}`
- Choice labels shown next to each handle
- Styled with Tailwind: rounded-xl border, shadow, 280px width
- Selected state: ring highlight
- Click should NOT be handled here (parent handles node selection)

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add custom StoryNode component for React Flow"
```

---

### Task 5: Node Edit Panel

**Files:**
- Create: `src/components/admin/node-edit-panel.tsx`

A side panel that appears when a node is selected in the tree editor.

**Step 1: Create the panel**

A "use client" component that receives the selected node data and callbacks. Contains:
- Node ID display (read-only for existing, editable for new)
- Text textarea (shadcn Textarea) for the story text
- Choices section:
  - List of choices, each with: label input (shadcn Input) + target node display
  - "Add Choice" button to add a new empty choice
  - Remove button per choice
- "Delete Node" button (destructive variant, disabled for "start" node)
- All changes fire onChange callbacks that update the parent state

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add node edit panel for story tree editor"
```

---

### Task 6: Story Tree Editor Component

**Files:**
- Create: `src/components/admin/tree-editor.tsx`

The main visual editor combining React Flow + node panel.

**Step 1: Create the editor**

A "use client" component that:
- Wraps everything in ReactFlowProvider
- Uses useNodesState / useEdgesState for controlled graph state
- Registers the custom "storyNode" node type (defined outside component)
- Renders ReactFlow canvas (flex-1, takes remaining height)
- Renders NodeEditPanel as a side panel (w-80) when a node is selected
- Toolbar at top with:
  - "Add Node" button → creates new node at center of viewport using useReactFlow
  - "Auto Layout" button → runs autoLayout and updates positions
  - "Fit View" button → calls fitView()
- Handles onConnect → adds edge with default label "Continue"
- Handles onNodeClick → selects node and shows edit panel
- Props: `value: StoryTree`, `onChange: (tree: StoryTree) => void`
- On mount: converts value to flow via storyTreeToFlow
- On any change: converts back via flowToStoryTree and calls onChange
- Must import `@xyflow/react/dist/style.css`
- Canvas container must have explicit height (e.g., h-[600px] or flex-1 in a flex container)

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add visual story tree editor with React Flow"
```

---

### Task 7: Story Metadata Form

**Files:**
- Create: `src/components/admin/story-form.tsx`

**Step 1: Create the form**

A "use client" component for story metadata + tree editor combined:
- Title input (shadcn Input)
- Summary textarea (shadcn Textarea)
- Age range select (shadcn Select): "4-8", "8-12"
- Price input (number, default 0)
- Cover image URL input (optional)
- Tree Editor component (from Task 6) below the metadata fields
- "Save Story" button at bottom
- Props: `initialData?: Story`, `onSave: (data) => void`, `saving: boolean`
- If initialData provided, pre-populate all fields + tree
- If no initialData, start with a default tree: `{ "start": { text: "Once upon a time...", choices: [] } }`

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add story metadata form with tree editor"
```

---

### Task 8: Admin Story List Page

**Files:**
- Create: `src/app/admin/page.tsx`

**Step 1: Create the admin list page**

A "use client" component that:
- Fetches stories from GET /api/admin/stories on mount
- Renders a shadcn Table with columns: Title, Age Range, Nodes (count), Endings (count), Created
- Row actions via shadcn DropdownMenu: "Edit" (links to /admin/stories/[id]), "Delete" (with confirm Dialog)
- Delete calls DELETE /api/admin/stories/[id] and refreshes the list
- "Create New Story" button at top → links to /admin/stories/new
- Page heading: "Story Admin"

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add admin story list page"
```

---

### Task 9: Create Story Page

**Files:**
- Create: `src/app/admin/stories/new/page.tsx`

**Step 1: Create the new story page**

A "use client" component that:
- Renders the StoryForm with no initialData
- onSave: POST to /api/admin/stories, on success redirect to /admin
- Shows loading state while saving
- Page heading: "Create New Story"

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add create story page"
```

---

### Task 10: Edit Story Page

**Files:**
- Create: `src/app/admin/stories/[id]/page.tsx`

**Step 1: Create the edit story page**

A "use client" component that:
- Fetches the story from GET /api/admin/stories (filter client-side by id, or add a GET by id route)
- Renders the StoryForm with initialData
- onSave: PUT to /api/admin/stories/[id], on success redirect to /admin
- Shows loading state while fetching and saving
- Page heading: "Edit Story"

Note on params: In Next.js 16, use `React.use(params)` in client components to unwrap the params Promise, or extract id from the URL via `useParams()` from `next/navigation`.

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add edit story page"
```

---

### Task 11: Admin Nav Link + Final Polish

**Step 1: Add admin link to navbar**

Modify `src/components/navbar.tsx`:
- Add an "Admin" link next to "Explore" (always visible, no auth check)

**Step 2: Full build + smoke test**

```bash
npm run build
```

Verify all routes:
- /admin → story list
- /admin/stories/new → create form + tree editor
- /admin/stories/[id] → edit form + tree editor

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add admin nav link and final polish"
```
