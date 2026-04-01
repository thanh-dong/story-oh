# Admin Story CRUD — Design

## Overview
Admin interface for creating, editing, and deleting branching stories with a visual tree editor powered by @xyflow/react.

## Access
No role system. `/admin` routes are open (no auth gate). Dev-only for now.

## Stack Addition
- **@xyflow/react** — visual node graph editor for story trees
- **dagre** — auto-layout algorithm for tree arrangement

## Pages

### /admin — Story List
- Table: title, age_range, node count, endings count, created_at
- Row actions: Edit, Delete (with confirm)
- "Create New Story" button

### /admin/stories/new — Create Story
- Metadata form: title, summary, age_range, price, cover_image URL
- Visual tree editor (see below)
- Save button → POST /api/admin/stories

### /admin/stories/[id] — Edit Story
- Same form + tree editor, pre-populated
- Save button → PUT /api/admin/stories/[id]

## Visual Tree Editor (@xyflow/react)

### Node Rendering
- Custom React Flow node component per StoryNode
- Shows: node ID label, text preview (truncated), output handles per choice
- "start" node: green border
- Ending nodes (no choices): gold border

### Connections
- Each choice = an edge from source choice handle → target node
- Edge labels show choice.label text

### Interactions
- Add node: toolbar button → new node with generated ID
- Edit node: click → side panel with node ID, text textarea, choices list
- Delete node: button in edit panel
- Connect: drag from choice handle to target node
- Auto-layout: dagre-based tree arrangement button

### Conversion Functions
- `storyTreeToFlow(tree: StoryTree)` → { nodes: Node[], edges: Edge[] }
- `flowToStoryTree(nodes: Node[], edges: Edge[])` → StoryTree

## API Routes (service role, bypasses RLS)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/admin/stories | Create story |
| PUT | /api/admin/stories/[id] | Update story |
| DELETE | /api/admin/stories/[id] | Delete story + cascade user_stories |

## Not in Scope
- No image upload (URL input only)
- No story preview/test-play from admin
- No undo/redo in tree editor
- No story versioning
- No bulk operations
