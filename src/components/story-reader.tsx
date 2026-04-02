"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import { Button } from "@/components/ui/button";
import type { Story } from "@/lib/types";

interface StoryReaderProps {
  story: Story;
  initialProgress: { current_node: string; history: string[] };
  userId: string | null;
}

const choiceColors = [
  "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white",
  "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white",
  "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white",
  "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white",
  "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white",
];

export function StoryReader({
  story,
  initialProgress,
  userId,
}: StoryReaderProps) {
  const [currentNode, setCurrentNode] = useState(
    initialProgress.current_node
  );
  const [history, setHistory] = useState<string[]>(initialProgress.history);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");
  const supabaseRef = useRef(createClient());

  const node = story.story_tree[currentNode];
  const isEnding = !node?.choices || node.choices.length === 0;
  const gradient = getGradient(story.title);
  const emoji = getStoryEmoji(story.title);

  const saveProgress = useCallback(
    async (nodeId: string, newHistory: string[]) => {
      if (!supabaseRef.current || !userId) return;
      await supabaseRef.current
        .from("user_stories")
        .update({
          progress: { current_node: nodeId, history: newHistory },
        })
        .eq("story_id", story.id)
        .eq("user_id", userId);
    },
    [story.id, userId]
  );

  function handleChoice(nextNodeId: string) {
    setFadeState("out");
    setTimeout(() => {
      const newHistory = [...history, nextNodeId];
      setCurrentNode(nextNodeId);
      setHistory(newHistory);
      saveProgress(nextNodeId, newHistory);
      setFadeState("in");
    }, 200);
  }

  function handleRestart() {
    setFadeState("out");
    setTimeout(() => {
      setCurrentNode("start");
      setHistory(["start"]);
      saveProgress("start", ["start"]);
      setFadeState("in");
    }, 200);
  }

  // Scroll to top on node change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentNode]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <p className="text-xl text-muted-foreground">
          Oops! This part of the story seems to be missing.
        </p>
        <Button
          size="lg"
          className="min-h-[56px] rounded-xl px-8 text-lg font-bold"
          onClick={handleRestart}
        >
          <RotateCcw className="size-5" data-icon="inline-start" />
          Start Over
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-12">
      {/* Top bar with back button and story title */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="lg"
          className="min-h-[44px] min-w-[44px] rounded-xl"
          render={<Link href={`/story/${story.id}`} />}
        >
          <ArrowLeft className="size-5" data-icon="inline-start" />
          Back
        </Button>
        <span className="truncate text-sm font-semibold text-muted-foreground">
          {story.title}
        </span>
      </div>

      {/* Gradient header */}
      <div
        className={`relative mb-8 flex h-32 w-full items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} sm:h-40`}
      >
        <span className="text-6xl drop-shadow-lg" aria-hidden="true">
          {emoji}
        </span>
        {/* Progress indicator */}
        <div className="absolute bottom-3 right-4 rounded-full bg-white/30 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
          Step {history.length}
        </div>
      </div>

      {/* Story content with fade animation */}
      <div
        className={`transition-all duration-200 ${
          fadeState === "in"
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
      >
        {isEnding ? (
          /* ===== Ending Screen ===== */
          <div className="flex flex-col items-center gap-8 text-center">
            {/* Celebration heading */}
            <div className="space-y-3">
              <p className="text-5xl" aria-hidden="true">
                🎉✨🌟
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                The End!
              </h2>
              <p className="text-4xl" aria-hidden="true">
                🎊🥳⭐
              </p>
            </div>

            {/* Ending text */}
            <p className="max-w-lg text-xl leading-relaxed text-muted-foreground sm:text-2xl">
              {node.text}
            </p>

            {/* Stats */}
            <div className="rounded-2xl bg-muted/50 px-6 py-4">
              <p className="text-sm font-semibold text-muted-foreground">
                You made{" "}
                <span className="text-primary">
                  {history.length - 1}{" "}
                  {history.length - 1 === 1 ? "choice" : "choices"}
                </span>{" "}
                on this adventure!
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="min-h-[56px] flex-1 rounded-xl px-8 text-lg font-bold sm:max-w-[240px]"
                onClick={handleRestart}
              >
                <RotateCcw className="size-5" data-icon="inline-start" />
                Read Again
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[56px] flex-1 rounded-xl px-8 text-lg font-bold sm:max-w-[240px]"
                render={<Link href="/library" />}
              >
                <BookOpen className="size-5" data-icon="inline-start" />
                Back to Library
              </Button>
            </div>
          </div>
        ) : (
          /* ===== Story Node ===== */
          <div className="space-y-8">
            {/* Story text */}
            <p className="text-xl leading-relaxed sm:text-2xl">{node.text}</p>

            {/* Choice heading */}
            <div className="space-y-1">
              <p className="text-base font-bold text-muted-foreground">
                What do you do? 🤔
              </p>
            </div>

            {/* Choice buttons */}
            <div className="flex flex-col gap-3">
              {node.choices.map((choice, index) => (
                <button
                  key={`${currentNode}-${choice.next}`}
                  onClick={() => handleChoice(choice.next)}
                  className={`min-h-[56px] w-full rounded-xl px-6 py-4 text-lg font-bold shadow-md transition-all duration-150 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
                    choiceColors[index % choiceColors.length]
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
