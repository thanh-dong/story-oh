import { type Node, type Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import type { StoryTree } from "./types";

export interface StoryNodeData {
  nodeId: string;
  text: string;
  choices: { label: string; next: string }[];
  isStart: boolean;
  isEnding: boolean;
  [key: string]: unknown;
}

export function storyTreeToFlow(tree: StoryTree): { nodes: Node<StoryNodeData>[]; edges: Edge[] } {
  const nodes: Node<StoryNodeData>[] = [];
  const edges: Edge[] = [];

  Object.entries(tree).forEach(([nodeId, node], index) => {
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

export function autoLayout<T extends Record<string, unknown> = Record<string, unknown>>(nodes: Node<T>[], edges: Edge[]): { nodes: Node<T>[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 280, height: 150 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 140, y: pos.y - 75 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function generateNodeId(): string {
  return `node_${Date.now().toString(36)}`;
}
