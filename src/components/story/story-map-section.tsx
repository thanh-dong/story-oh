"use client";

import { useState } from "react";
import type { StoryTree } from "@/lib/types";
import { TreeView } from "@/components/story/tree-view";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Map as MapIcon } from "lucide-react";

interface StoryMapSectionProps {
  storyTree: StoryTree;
  defaultOpen?: boolean;
}

export function StoryMapSection({
  storyTree,
  defaultOpen = false,
}: StoryMapSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-8 rounded-[14px] border border-border bg-parchment p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <MapIcon className="size-4 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Story Map
          </span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="mt-4">
          <TreeView value={storyTree} mode="preview" height="60vh" />
          <p className="mt-2 text-xs text-muted-foreground">
            Pan, zoom, and collapse branches to review story structure before assigning.
          </p>
        </div>
      )}
    </div>
  );
}
