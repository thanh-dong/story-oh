"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, RotateCcw } from "lucide-react";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import { Button } from "@/components/ui/button";
import type { Story } from "@/lib/types";

interface StoryReaderProps {
  story: Story;
  initialProgress: { current_node: string; history: string[] };
  userId: string | null;
}

const choiceStyles = [
  "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600",
  "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600",
  "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600",
  "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
  "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600",
];

export function StoryReader({
  story,
  initialProgress,
  userId,
}: StoryReaderProps) {
  const [currentNode, setCurrentNode] = useState(initialProgress.current_node);
  const [history, setHistory] = useState<string[]>(initialProgress.history);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  const node = story.story_tree[currentNode];
  const isEnding = !node?.choices || node.choices.length === 0;
  const gradient = getGradient(story.title);
  const emoji = getStoryEmoji(story.title);

  const saveProgress = useCallback(
    async (nodeId: string, newHistory: string[]) => {
      if (!userId) return;
      fetch(`/api/stories/${story.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_node: nodeId, history: newHistory }),
      }).catch(() => {});
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
      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl bg-parchment py-20 text-center">
        <span className="text-5xl" aria-hidden="true">&#x1F4D6;</span>
        <p className="text-lg text-muted-foreground">
          This part of the story seems to be missing.
        </p>
        <Button
          size="lg"
          className="min-h-[56px] rounded-full px-8 text-lg font-bold"
          onClick={handleRestart}
        >
          <RotateCcw className="size-5" data-icon="inline-start" />
          Start Over
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="lg"
          className="min-h-[44px] rounded-xl"
          render={<Link href={`/story/${story.id}`} />}
        >
          <ArrowLeft className="size-5" data-icon="inline-start" />
          Back
        </Button>
        <div className="flex items-center gap-2 rounded-full bg-parchment px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <span aria-hidden="true">&#x1F4D6;</span>
          Page {history.length}
        </div>
      </div>

      {/* Gradient header */}
      <div
        className={`relative mb-10 flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} storybook-shadow sm:h-44`}
      >
        <span className="text-6xl drop-shadow-lg sm:text-7xl" aria-hidden="true">
          {emoji}
        </span>
      </div>

      {/* Story content */}
      <div
        className={`transition-all duration-300 ease-out ${
          fadeState === "in"
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
      >
        {isEnding ? (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="space-y-4">
              <span className="inline-block text-5xl sm:text-6xl" aria-hidden="true">&#x2728;</span>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                The End
              </h2>
            </div>

            <div className="rounded-2xl bg-parchment p-6 sm:p-8">
              <p className="text-lg leading-relaxed sm:text-xl">
                {node.text}
              </p>
            </div>

            <p className="text-sm font-medium text-muted-foreground">
              You made{" "}
              <span className="font-bold text-primary">
                {history.length - 1} {history.length - 1 === 1 ? "choice" : "choices"}
              </span>{" "}
              on this adventure
            </p>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="min-h-[56px] flex-1 rounded-full px-8 text-lg font-bold sm:max-w-[220px]"
                onClick={handleRestart}
              >
                <RotateCcw className="size-5" data-icon="inline-start" />
                Read Again
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[56px] flex-1 rounded-full px-8 text-lg font-bold sm:max-w-[220px]"
                render={<Link href="/explore" />}
              >
                <BookOpen className="size-5" data-icon="inline-start" />
                More Stories
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Story text */}
            <div className="rounded-2xl bg-parchment p-6 storybook-shadow sm:p-8">
              <p className="text-lg leading-[1.8] sm:text-xl sm:leading-[1.8]">
                {node.text}
              </p>
            </div>

            {/* Choices */}
            <div className="space-y-4">
              <p className="text-center text-sm font-bold text-muted-foreground">
                What do you do?
              </p>

              <div className="flex flex-col gap-3">
                {node.choices.map((choice, index) => (
                  <button
                    key={`${currentNode}-${choice.next}`}
                    onClick={() => handleChoice(choice.next)}
                    className={`min-h-[56px] w-full rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:text-xl ${
                      choiceStyles[index % choiceStyles.length]
                    }`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
