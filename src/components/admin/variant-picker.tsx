"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerateStoryResponse } from "@/lib/types";

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
  if (variants.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">
          {variants.length === 1 ? "Your story" : `Pick one (${variants.length} options)`}
        </h2>
        <span className="text-xs text-muted-foreground">
          {variants.length === 1
            ? "Regenerate for more options, or save this one"
            : "Click a card to select, then save"}
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
          const nodeCount = Object.keys(variant.story_tree).length;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              className={`group relative flex flex-col overflow-hidden rounded-2xl bg-card text-left ring-2 transition-all ${
                isSelected
                  ? "ring-primary storybook-shadow"
                  : "ring-foreground/10 hover:ring-foreground/30"
              }`}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" strokeWidth={3} />
                </div>
              )}

              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
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
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Option {index + 1}</span>
                  <span>·</span>
                  <span>Age {variant.age_range}</span>
                  <span>·</span>
                  <span>{nodeCount} nodes</span>
                </div>
                <h3 className="font-heading text-base font-bold leading-snug">
                  {variant.title}
                </h3>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {variant.summary}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save selected story"}
        </Button>
      </div>
    </div>
  );
}
