import type { StoryTree } from "@/lib/types";
import { estimateReadingMinutes } from "@/lib/tree-utils";

export interface StoryStats {
  /** Number of story nodes — shown to users as "pages" (matches story-card.tsx). */
  pageCount: number;
  /** Total branching choices across the tree (sum of node.choices.length). */
  optionCount: number;
  /** Nodes with no choices — terminal outcomes. */
  endingCount: number;
  /** Distinct root-to-ending walks. Cycle-safe with a safety cap. */
  pathCount: number;
  /** Longest depth from start. */
  maxDepth: number;
  /** Word count across node text + choice labels (matches reading-time source). */
  wordCount: number;
  /** Estimated minutes — uses the project's kid-paced 130 wpm formula. */
  readingMinutes: number;
}

const MAX_PATH_TRAVERSAL = 200; // safety cap for pathCount on dense/cyclic trees

export function computeStoryStats(tree: StoryTree): StoryStats {
  const nodes = Object.entries(tree);
  const pageCount = nodes.length;

  let wordCount = 0;
  let optionCount = 0;
  let endingCount = 0;
  for (const [, node] of nodes) {
    wordCount += countWords(node.text);
    const choices = node.choices ?? [];
    optionCount += choices.length;
    if (choices.length === 0) {
      endingCount++;
    } else {
      for (const choice of choices) {
        wordCount += countWords(choice.label);
      }
    }
  }

  const { pathCount, maxDepth } = countPathsAndDepth(tree);
  const readingMinutes = estimateReadingMinutes(tree);

  return {
    pageCount,
    optionCount,
    endingCount,
    pathCount,
    maxDepth,
    wordCount,
    readingMinutes,
  };
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
