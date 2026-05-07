import type { StoryTree } from "@/lib/types";

export interface StoryStats {
  nodeCount: number;
  wordCount: number;
  readingMinutes: number;
  pathCount: number;
  endingCount: number;
  maxDepth: number;
}

const WORDS_PER_MINUTE = 180;
const MAX_PATH_TRAVERSAL = 200; // safety cap for pathCount on dense trees

export function computeStoryStats(tree: StoryTree): StoryStats {
  const nodes = Object.entries(tree);
  const nodeCount = nodes.length;

  let wordCount = 0;
  let endingCount = 0;
  for (const [, node] of nodes) {
    wordCount += countWords(node.text);
    if (!node.choices || node.choices.length === 0) endingCount++;
  }

  const readingMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

  const { pathCount, maxDepth } = countPathsAndDepth(tree);

  return { nodeCount, wordCount, readingMinutes, pathCount, endingCount, maxDepth };
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countPathsAndDepth(tree: StoryTree): { pathCount: number; maxDepth: number } {
  const start = tree.start;
  if (!start) return { pathCount: 0, maxDepth: 0 };

  let pathCount = 0;
  let maxDepth = 0;
  const visited = new Set<string>();
  let traversals = 0;

  function walk(nodeId: string, depth: number): void {
    if (traversals++ > MAX_PATH_TRAVERSAL) return;
    const node = tree[nodeId];
    if (!node) return;
    if (depth > maxDepth) maxDepth = depth;
    if (!node.choices || node.choices.length === 0) {
      pathCount++;
      return;
    }
    if (visited.has(nodeId)) return; // cycle guard
    visited.add(nodeId);
    for (const choice of node.choices) {
      walk(choice.next, depth + 1);
    }
    visited.delete(nodeId);
  }

  walk("start", 0);
  return { pathCount: Math.min(pathCount, MAX_PATH_TRAVERSAL), maxDepth };
}
