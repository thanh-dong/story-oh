"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Clock, Eye, Flag, GitBranch, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerateStoryResponse } from "@/lib/types";
import { computeStoryStats } from "@/lib/tree-stats";
import { StoryPreviewDialog } from "@/components/admin/story-preview-dialog";

interface VariantPickerProps {
  variants: GenerateStoryResponse[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSave: () => void;
  saving: boolean;
}

export function VariantPicker({
  variants,
  selectedIndex,
  onSelect,
  onSave,
  saving,
}: VariantPickerProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (variants.length === 0) return null;

  const previewVariant = previewIndex !== null ? variants[previewIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">
          {variants.length === 1 ? "Your story" : `Pick one (${variants.length} options)`}
        </h2>
        <span className="text-xs text-muted-foreground">
          {variants.length === 1
            ? "Read it through, then save — or regenerate for more options"
            : "Tap Preview to read the full story before saving"}
        </span>
      </div>

      <div
        className={`grid gap-4 ${
          variants.length === 1
            ? "grid-cols-1"
            : variants.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {variants.map((variant, index) => {
          const isSelected = index === selectedIndex;
          const stats = computeStoryStats(variant.story_tree);
          return (
            <article
              key={index}
              className={`group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-2 transition-all ${
                isSelected
                  ? "ring-primary storybook-shadow"
                  : "ring-foreground/10 hover:ring-foreground/30"
              }`}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Check className="size-4" strokeWidth={3} />
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelect(index)}
                className="relative aspect-[4/3] w-full overflow-hidden bg-muted"
                aria-label={`Select option ${index + 1}: ${variant.title}`}
              >
                {variant.cover_image ? (
                  <Image
                    src={variant.cover_image}
                    alt={variant.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No cover
                  </div>
                )}
              </button>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Option {index + 1}</span>
                  <span>·</span>
                  <span>Age {variant.age_range}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="text-left"
                >
                  <h3 className="font-heading text-base font-bold leading-snug">
                    {variant.title}
                  </h3>
                </button>

                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {variant.summary}
                </p>

                <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                  <li className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 shrink-0" />
                    {stats.readingMinutes} min read
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <GitBranch className="size-3.5 shrink-0" />
                    {stats.pathCount} {stats.pathCount === 1 ? "path" : "paths"}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Flag className="size-3.5 shrink-0" />
                    {stats.endingCount} {stats.endingCount === 1 ? "ending" : "endings"}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Type className="size-3.5 shrink-0" />
                    {stats.wordCount} words
                  </li>
                </ul>

                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewIndex(index)}
                  >
                    <Eye className="mr-1 size-3.5" />
                    Preview
                  </Button>
                  <Button
                    variant={isSelected ? "default" : "secondary"}
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelect(index)}
                  >
                    {isSelected ? (
                      <>
                        <Check className="mr-1 size-3.5" strokeWidth={3} />
                        Selected
                      </>
                    ) : (
                      "Select"
                    )}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-parchment p-4">
        <p className="text-sm">
          {variants[selectedIndex] ? (
            <>
              <span className="text-muted-foreground">Saving:</span>{" "}
              <strong>{variants[selectedIndex].title}</strong>
            </>
          ) : (
            <span className="text-muted-foreground">Select a story to save</span>
          )}
        </p>
        <Button onClick={onSave} disabled={saving || !variants[selectedIndex]}>
          {saving ? "Saving..." : "Save selected story"}
        </Button>
      </div>

      <StoryPreviewDialog
        variant={previewVariant}
        open={previewIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
        onSelect={() => {
          if (previewIndex !== null) {
            onSelect(previewIndex);
            setPreviewIndex(null);
          }
        }}
        selectLabel={
          previewIndex !== null && previewIndex === selectedIndex
            ? "Already selected"
            : "Use this story"
        }
      />
    </div>
  );
}
