"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpen, Clock, Flag, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveStoryDialog } from "@/components/v1/save-story-dialog";
import { computeStoryStats } from "@/lib/tree-stats";
import type { GenerateStoryResponse } from "@/lib/types";
import { emitV1 } from "@/lib/v1-telemetry";

export function GeneratingPoller({ draftId }: { draftId: string }) {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/drafts/${draftId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "ready" || data.status === "failed") {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // ignore network errors — keep polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [draftId, router]);
  return null;
}

interface PreviewClientProps {
  draftId: string;
  story: GenerateStoryResponse;
  storyTitle: string;
}

export function PreviewClient({ draftId, story, storyTitle }: PreviewClientProps) {
  const router = useRouter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState("start");
  const [path, setPath] = useState<string[]>(["start"]);

  useEffect(() => {
    emitV1("v1.preview_reached", { draftId });
  }, [draftId]);

  const stats = computeStoryStats(story.story_tree);
  const node = story.story_tree[currentNode];
  const isEnding = !node?.choices || node.choices.length === 0;

  function chooseNext(nextId: string) {
    setCurrentNode(nextId);
    setPath((p) => [...p, nextId]);
  }

  function reset() {
    setCurrentNode("start");
    setPath(["start"]);
  }

  return (
    <>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />~{stats.readingMinutes} min read
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="size-3.5" />
          {stats.pageCount} {stats.pageCount === 1 ? "page" : "pages"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3.5" />
          {stats.optionCount} {stats.optionCount === 1 ? "choice" : "choices"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flag className="size-3.5" />
          {stats.endingCount} {stats.endingCount === 1 ? "ending" : "endings"}
        </span>
      </div>

      {/* Cover image */}
      {story.cover_image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
          <Image
            src={story.cover_image}
            alt={story.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized
          />
        </div>
      )}

      {/* Story walk-through */}
      <div className="rounded-[18px] border border-border bg-card p-6 sm:p-8">
        {node ? (
          <div className="space-y-5">
            <p className="font-serif text-base leading-relaxed text-foreground sm:text-lg sm:leading-loose">
              {node.text}
            </p>

            {isEnding ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <Flag className="mx-auto mb-2 size-5 text-primary" />
                <p className="text-sm font-semibold text-primary">The End</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One of {stats.endingCount} possible endings
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 text-xs font-semibold text-primary hover:underline"
                >
                  Start from beginning
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  What happens next?
                </p>
                <div className="grid gap-2">
                  {node.choices.map((choice, i) => (
                    <button
                      key={`${choice.next}-${i}`}
                      type="button"
                      onClick={() => chooseNext(choice.next)}
                      className="rounded-xl border border-foreground/10 bg-background px-4 py-3 text-left text-sm font-medium transition-all hover:border-primary/50 hover:bg-primary/5"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {path.length > 1 && (
              <div className="flex justify-end border-t pt-3">
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  ↩ Restart story
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-destructive">Story node not found.</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/v1")}
          className="rounded-full px-6 py-5 text-base font-semibold"
        >
          &larr; Edit story
        </Button>
        <Button
          onClick={() => {
            emitV1("v1.save_intent", { draftId });
            setSaveOpen(true);
          }}
          className="rounded-full px-8 py-5 text-base font-bold"
        >
          Save my story &rarr;
        </Button>
      </div>

      <SaveStoryDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        draftId={draftId}
        defaultStoryName={storyTitle}
      />
    </>
  );
}
