import { type Node, type Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import type { StoryTree } from "./types";

export interface StoryNodeData {
  nodeId: string;
  text: string;
  choices: { label: string; next: string }[];
  isStart: boolean;
  isEnding: boolean;
  branchId?: number;
  branchColor?: string;
  hiddenChildCount?: number;
  collapsed?: boolean;
  [key: string]: unknown;
}

// Stable mindmap palette. Index 0 is reserved for the root/start node.
const BRANCH_PALETTE = [
  "#94a3b8", // slate (root/neutral)
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
];

export function branchColorForId(branchId: number | undefined): string {
  if (branchId === undefined || branchId < 0) return BRANCH_PALETTE[0];
  return BRANCH_PALETTE[1 + (branchId % (BRANCH_PALETTE.length - 1))];
}

// BFS from "start". Direct children of start get branchId = choiceIndex; their
// descendants inherit. Convergent nodes keep first-assigned color. Cycles back
// to ancestors do not re-color (visited guard).
export function computeBranchColors(tree: StoryTree): Record<string, { branchId: number; color: string }> {
  const out: Record<string, { branchId: number; color: string }> = {};
  if (!tree.start) return out;

  out.start = { branchId: -1, color: branchColorForId(-1) };

  type QueueItem = { id: string; branchId: number };
  const queue: QueueItem[] = [];

  tree.start.choices.forEach((choice, idx) => {
    if (!choice.next || !tree[choice.next] || out[choice.next]) return;
    out[choice.next] = { branchId: idx, color: branchColorForId(idx) };
    queue.push({ id: choice.next, branchId: idx });
  });

  while (queue.length > 0) {
    const { id, branchId } = queue.shift()!;
    const node = tree[id];
    if (!node) continue;
    for (const choice of node.choices) {
      if (!choice.next || !tree[choice.next] || out[choice.next]) continue;
      out[choice.next] = { branchId, color: branchColorForId(branchId) };
      queue.push({ id: choice.next, branchId });
    }
  }

  return out;
}

export function storyTreeToFlow(tree: StoryTree): { nodes: Node<StoryNodeData>[]; edges: Edge[] } {
  const nodes: Node<StoryNodeData>[] = [];
  const edges: Edge[] = [];
  const colors = computeBranchColors(tree);

  Object.entries(tree).forEach(([nodeId, node], index) => {
    const color = colors[nodeId]?.color ?? BRANCH_PALETTE[0];
    nodes.push({
      id: nodeId,
      type: "storyNode",
      position: { x: 0, y: index * 200 },
      data: {
        nodeId,
        text: node.text,
        choices: node.choices,
        isStart: nodeId === "start",
        isEnding: node.choices.length === 0,
        branchId: colors[nodeId]?.branchId,
        branchColor: color,
      },
    });

    node.choices.forEach((choice, choiceIndex) => {
      const targetColor = colors[choice.next]?.color ?? color;
      edges.push({
        id: `${nodeId}-${choice.next}-${choiceIndex}`,
        source: nodeId,
        sourceHandle: `choice-${choiceIndex}`,
        target: choice.next,
        label: choice.label,
        type: "default",
        style: { stroke: targetColor, strokeWidth: 2 },
      });
    });
  });

  const layout = autoLayout(nodes, edges);
  return { nodes: layout.nodes as Node<StoryNodeData>[], edges: layout.edges };
}

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

    // Use node data choices as source of truth for labels,
    // edges provide the connection targets
    const choices = data.choices.map((choice, index) => {
      const matchingEdge = nodeEdges.find(
        (e) => e.sourceHandle === `choice-${index}`
      );
      return {
        label: choice.label || (matchingEdge?.label as string) || "Continue",
        next: matchingEdge?.target ?? choice.next,
      };
    });

    tree[data.nodeId] = {
      text: data.text,
      choices,
    };
  }

  return tree;
}

const NODE_W = 240;
const NODE_H = 120;

export function autoLayout<T extends Record<string, unknown> = Record<string, unknown>>(nodes: Node<T>[], edges: Edge[]): { nodes: Node<T>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function generateNodeId(): string {
  return `node_${Date.now().toString(36)}`;
}

// BFS from "start". When a collapsed node is reached we still mark it visible,
// but we do NOT enqueue its choice targets. Convergent nodes still appear if
// reachable via any other non-collapsed path. Cycles are guarded by visited.
export function computeVisibleNodeIds(
  tree: StoryTree,
  collapsed: Set<string>
): Set<string> {
  const visible = new Set<string>();
  if (!tree.start) return visible;

  const queue: string[] = ["start"];
  visible.add("start");

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (collapsed.has(id)) continue; // do not expand through collapsed nodes
    const node = tree[id];
    if (!node) continue;
    for (const choice of node.choices) {
      if (!choice.next || !tree[choice.next]) continue;
      if (visible.has(choice.next)) continue;
      visible.add(choice.next);
      queue.push(choice.next);
    }
  }

  return visible;
}

const KID_WORDS_PER_MINUTE = 130;

export function estimateReadingMinutes(tree: StoryTree): number {
  let totalWords = 0;
  for (const node of Object.values(tree)) {
    if (node.text) totalWords += node.text.trim().split(/\s+/).filter(Boolean).length;
    for (const choice of node.choices) {
      if (choice.label) totalWords += choice.label.trim().split(/\s+/).filter(Boolean).length;
    }
  }
  if (totalWords === 0) return 1;
  return Math.max(1, Math.ceil(totalWords / KID_WORDS_PER_MINUTE));
}
