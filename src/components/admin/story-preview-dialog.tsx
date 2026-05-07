"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { BookOpen, Compass, Flag, Clock, GitBranch, RotateCcw, Type } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GenerateStoryResponse } from "@/lib/types";
import { computeStoryStats } from "@/lib/tree-stats";

type Mode = "walk" | "read-all";

interface StoryPreviewDialogProps {
  variant: GenerateStoryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  selectLabel?: string;
}

export function StoryPreviewDialog({
  variant,
  open,
  onOpenChange,
  onSelect,
  selectLabel = "Use this story",
}: StoryPreviewDialogProps) {
  const [mode, setMode] = useState<Mode>("walk");
  const [currentNode, setCurrentNode] = useState("start");
  const [path, setPath] = useState<string[]>(["start"]);

  const stats = useMemo(
    () => (variant ? computeStoryStats(variant.story_tree) : null),
    [variant],
  );

  const flatNodes = useMemo(() => {
    if (!variant) return [];
    return flattenTree(variant.story_tree);
  }, [variant]);

  function reset() {
    setCurrentNode("start");
    setPath(["start"]);
  }

  function chooseNext(nextId: string) {
    setCurrentNode(nextId);
    setPath((p) => [...p, nextId]);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      reset();
      setMode("walk");
    }
    onOpenChange(next);
  }

  if (!variant) return null;

  const node = variant.story_tree[currentNode];
  const isEnding = !node?.choices || node.choices.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="grid max-h-[90vh] w-full max-w-3xl grid-rows-[auto_1fr_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b bg-card px-5 py-4">
          <DialogTitle className="font-heading text-lg font-bold leading-tight">
            {variant.title}
          </DialogTitle>
          {stats && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {stats.readingMinutes} min read
              </span>
              <span>·</span>
              <span>Age {variant.age_range}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3.5" />
                {stats.pathCount} {stats.pathCount === 1 ? "path" : "paths"}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Flag className="size-3.5" />
                {stats.endingCount} {stats.endingCount === 1 ? "ending" : "endings"}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Type className="size-3.5" />
                {stats.wordCount} words
              </span>
            </div>
          )}

          <div className="mt-2 flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("walk")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "walk"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-3.5" />
              Walk through
            </button>
            <button
              type="button"
              onClick={() => setMode("read-all")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === "read-all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5" />
              Read all text
            </button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-5">
          {mode === "walk" ? (
            <WalkMode
              variant={variant}
              currentNode={currentNode}
              node={node}
              isEnding={isEnding}
              path={path}
              onChoose={chooseNext}
              onReset={reset}
            />
          ) : (
            <ReadAllMode variant={variant} flatNodes={flatNodes} />
          )}
        </div>

        <DialogFooter className="border-t bg-muted/50 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back to options
          </Button>
          <Button onClick={onSelect}>{selectLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalkMode({
  variant,
  currentNode,
  node,
  isEnding,
  path,
  onChoose,
  onReset,
}: {
  variant: GenerateStoryResponse;
  currentNode: string;
  node: { text: string; choices: { label: string; next: string }[] } | undefined;
  isEnding: boolean;
  path: string[];
  onChoose: (id: string) => void;
  onReset: () => void;
}) {
  if (!node) {
    return <p className="text-sm text-destructive">Node &quot;{currentNode}&quot; not found.</p>;
  }

  return (
    <div className="space-y-5">
      {currentNode === "start" && variant.cover_image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src={variant.cover_image}
            alt={variant.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized
          />
        </div>
      )}

      <p className="font-serif text-base leading-relaxed text-foreground sm:text-lg sm:leading-loose">
        {node.text}
      </p>

      {isEnding ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <Flag className="mx-auto mb-2 size-5 text-primary" />
          <p className="text-sm font-semibold text-primary">The End</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One of {pathSummary(variant)} possible endings
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What happens next?
          </p>
          <div className="grid gap-2">
            {node.choices.map((choice, i) => (
              <button
                key={`${choice.next}-${i}`}
                type="button"
                onClick={() => onChoose(choice.next)}
                className="rounded-xl border border-foreground/10 bg-card px-4 py-3 text-left text-sm font-medium transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {path.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            <span className="font-semibold">Path:</span>{" "}
            <span className="break-all">{path.join(" → ")}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1 size-3.5" />
            Restart
          </Button>
        </div>
      )}
    </div>
  );
}

function ReadAllMode({
  variant,
  flatNodes,
}: {
  variant: GenerateStoryResponse;
  flatNodes: { id: string; text: string; choices: { label: string; next: string }[]; depth: number }[];
}) {
  return (
    <div className="space-y-6">
      {variant.cover_image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
          <Image
            src={variant.cover_image}
            alt={variant.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized
          />
        </div>
      )}

      <p className="font-serif text-sm italic text-muted-foreground">{variant.summary}</p>

      <div className="space-y-5">
        {flatNodes.map(({ id, text, choices }) => {
          const isEnding = choices.length === 0;
          return (
            <section
              key={id}
              className="border-l-2 border-foreground/10 pl-4"
            >
              <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {id}
                {isEnding && <span className="ml-2 text-primary">· ending</span>}
              </p>
              <p className="font-serif text-sm leading-relaxed text-foreground sm:text-base">
                {text}
              </p>
              {choices.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {choices.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">→</span> {c.label}{" "}
                      <span className="opacity-50">({c.next})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function pathSummary(variant: GenerateStoryResponse): number {
  return computeStoryStats(variant.story_tree).endingCount;
}

function flattenTree(tree: import("@/lib/types").StoryTree) {
  const order: string[] = [];
  const seen = new Set<string>();
  const queue = ["start"];
  while (queue.length) {
    const id = queue.shift()!;
    if (!id || seen.has(id) || !tree[id]) continue;
    seen.add(id);
    order.push(id);
    for (const choice of tree[id].choices ?? []) {
      if (!seen.has(choice.next)) queue.push(choice.next);
    }
  }
  for (const id of Object.keys(tree)) {
    if (!seen.has(id)) order.push(id);
  }
  return order.map((id) => ({
    id,
    text: tree[id].text,
    choices: tree[id].choices ?? [],
    depth: 0,
  }));
}
