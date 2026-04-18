"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Stamp, Ornament, PageBreadcrumbs } from "@/components/editorial";
import { Button } from "@/components/ui/button";
import type { Story } from "@/lib/types";

interface StoryReaderProps {
  story: Story;
  initialProgress: { current_node: string; history: string[] };
  userId: string | null;
  childId?: string | null;
  backHref?: string;
  moreStoriesHref?: string;
}

const choiceTones = ["primary", "orange", "green", "purple", "pink"] as const;
const choiceTints = [
  "oklch(0.52 0.18 275 / 0.08)",
  "oklch(0.73 0.17 55 / 0.10)",
  "oklch(0.70 0.16 155 / 0.10)",
  "oklch(0.65 0.18 290 / 0.10)",
  "oklch(0.68 0.19 350 / 0.10)",
];

export function StoryReader({
  story,
  initialProgress,
  userId,
  childId,
  backHref,
  moreStoriesHref,
}: StoryReaderProps) {
  const [currentNode, setCurrentNode] = useState(initialProgress.current_node);
  const [history, setHistory] = useState<string[]>(initialProgress.history);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  const node = story.story_tree[currentNode];
  const isEnding = !node?.choices || node.choices.length === 0;
  const totalNodes = Object.keys(story.story_tree).length;

  const saveProgress = useCallback(
    async (nodeId: string, newHistory: string[]) => {
      if (!userId) return;
      fetch(`/api/stories/${story.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_node: nodeId,
          history: newHistory,
          childId: childId ?? undefined,
        }),
      }).catch(() => {});
    },
    [story.id, userId, childId]
  );

  // ── TTS ──
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setTtsState("idle");
  }

  async function handleReadAloud(text: string) {
    if (ttsState === "playing") {
      stopAudio();
      return;
    }

    setTtsState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        setTtsState("idle");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTtsState("idle");
        audioRef.current = null;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setTtsState("idle");
        audioRef.current = null;
      };

      await audio.play();
      setTtsState("playing");
    } catch {
      setTtsState("idle");
    }
  }

  useEffect(() => {
    return () => stopAudio();
  }, [currentNode]);

  function handleChoice(nextNodeId: string) {
    setFadeState("out");
    setTimeout(() => {
      const newHistory = [...history, nextNodeId];
      setCurrentNode(nextNodeId);
      setHistory(newHistory);
      saveProgress(nextNodeId, newHistory);
      setFadeState("in");
    }, 250);
  }

  function handleRestart() {
    setFadeState("out");
    setTimeout(() => {
      setCurrentNode("start");
      setHistory(["start"]);
      saveProgress("start", ["start"]);
      setFadeState("in");
    }, 250);
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentNode]);

  if (!node) {
    return (
      <div className="grain min-h-screen bg-parchment">
        <div className="mx-auto flex max-w-[720px] flex-col items-center gap-6 px-6 py-20 text-center">
          <p className="text-lg text-muted-foreground">
            This part of the story seems to be missing.
          </p>
          <Button size="lg" className="rounded-full px-8 text-lg font-bold" onClick={handleRestart}>
            <RotateCcw className="size-5" data-icon="inline-start" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // Get first letter for drop cap
  const text = node.text;
  const firstLetter = text.charAt(0);
  const restOfFirstSentence = text.slice(1);

  return (
    <div className="grain min-h-screen bg-parchment">
      <div className="mx-auto max-w-[720px] px-6 pb-16 pt-8">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={backHref ?? `/story/${story.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            &larr; Back to library
          </Link>
          <div className="flex items-center gap-3.5">
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Page {history.length} of {totalNodes}
            </span>
            <PageBreadcrumbs count={Math.min(totalNodes, 20)} current={Math.min(history.length - 1, Math.min(totalNodes, 20) - 1)} />
          </div>
        </div>

        {/* Story header */}
        <div className="mb-7 text-center">
          <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {story.title}
          </span>
          <h1 className="display mt-2.5 text-3xl font-black sm:text-[44px]" style={{ letterSpacing: "-0.02em" }}>
            {isEnding ? "The End" : `Page ${history.length}`}
          </h1>
          <div className="mt-3.5 flex items-center justify-center gap-2.5">
            <Ornament kind="diamond" size={10} color="var(--kid-orange)" />
            <Ornament kind="star" size={12} color="var(--kid-yellow)" />
            <Ornament kind="diamond" size={10} color="var(--kid-pink)" />
          </div>
        </div>

        {/* Content */}
        <div
          className={`transition-all duration-300 ease-out ${
            fadeState === "in" ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {/* Body paper */}
          <div className="relative rounded-[18px] border border-border bg-card p-8 shadow-card sm:px-11 sm:py-10">
            {/* Drop cap + prose */}
            <p className="display m-0 text-lg leading-[1.7] text-ink sm:text-xl" style={{ letterSpacing: "-0.005em" }}>
              <span
                className="display float-left pr-3.5 pt-1.5 text-[86px] font-black italic leading-[0.85] text-primary"
              >
                {firstLetter}
              </span>
              {restOfFirstSentence}
            </p>

            {/* Read aloud button */}
            {userId && (
              <button
                onClick={() => handleReadAloud(text)}
                disabled={ttsState === "loading"}
                className="absolute right-5 top-5 grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-parchment shadow-card"
                aria-label={ttsState === "playing" ? "Stop reading" : "Read aloud"}
              >
                {ttsState === "loading" ? (
                  <Loader2 className="size-4 animate-spin text-ink" />
                ) : ttsState === "playing" ? (
                  <VolumeX className="size-4 text-ink" />
                ) : (
                  <Volume2 className="size-4 text-ink" />
                )}
              </button>
            )}
          </div>

          {isEnding ? (
            /* Ending state */
            <div className="mt-9 flex flex-col items-center gap-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                You made{" "}
                <span className="font-bold text-primary">
                  {history.length - 1} {history.length - 1 === 1 ? "choice" : "choices"}
                </span>{" "}
                on this adventure
              </p>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-base font-bold text-background"
                >
                  <RotateCcw className="size-4" />
                  Read Again
                </button>
                <Link
                  href={moreStoriesHref ?? "/explore"}
                  className="inline-flex items-center justify-center rounded-full border-[1.5px] border-ink px-6 py-4 text-base font-bold text-ink"
                >
                  More Stories
                </Link>
              </div>
            </div>
          ) : (
            /* Choice block */
            <div className="mt-9">
              <div className="mb-[18px] flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What happens next?
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-3">
                {node.choices.map((choice, i) => (
                  <button
                    key={`${currentNode}-${choice.next}`}
                    onClick={() => handleChoice(choice.next)}
                    className="relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-[14px] border border-border bg-card px-5 py-[18px] text-left transition-all hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 w-1.5"
                      style={{ background: choiceTints[i % choiceTints.length] }}
                    />
                    <Stamp n={i + 1} tone={choiceTones[i % choiceTones.length]} />
                    <span className="display flex-1 text-lg font-bold sm:text-xl" style={{ letterSpacing: "-0.01em" }}>
                      {choice.label}
                    </span>
                    <span className="text-lg text-muted-foreground">&rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
