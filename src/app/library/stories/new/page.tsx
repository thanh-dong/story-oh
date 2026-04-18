"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StoryForm } from "@/components/admin/story-form";
import { GenerateStoryForm } from "@/components/admin/generate-story-form";
import type { GenerateStoryResponse, StoryTree } from "@/lib/types";

type Mode = "manual" | "generate";

export default function UserCreateStoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [generatedData, setGeneratedData] = useState<GenerateStoryResponse | null>(null);
  const [credits, setCredits] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/me/credits")
      .then((r) => r.json())
      .then((d) => setCredits(d.credits))
      .catch(() => {});
  }, []);

  async function handleSave(data: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
    require_login: boolean;
    story_tree: StoryTree;
  }) {
    setSaving(true);
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/library");
    }
    setSaving(false);
  }

  function handleGenerated(data: GenerateStoryResponse) {
    setGeneratedData(data);
    setMode("manual");
  }

  const initialData = generatedData
    ? {
        title: generatedData.title,
        summary: generatedData.summary,
        age_range: generatedData.age_range,
        price: 0,
        cover_image: generatedData.cover_image ?? null,
        require_login: false,
        story_tree: generatedData.story_tree,
      }
    : undefined;

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              New Story
            </span>
          </div>

          <Link href="/library" className="inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground">
            &larr; Back to library
          </Link>

          <h1 className="display text-3xl font-black sm:text-[44px]" style={{ letterSpacing: "-0.02em" }}>
            Create a <em className="font-medium italic text-primary">story</em>.
          </h1>

      <div className="flex gap-1 rounded-[14px] bg-muted p-1">
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            mode === "manual"
              ? "bg-card text-foreground storybook-shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode("generate")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            mode === "generate"
              ? "bg-card text-foreground storybook-shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          AI Generate
        </button>
      </div>

      {mode === "manual" ? (
        <StoryForm
          key={generatedData ? JSON.stringify(generatedData) : "empty"}
          initialData={initialData}
          onSave={handleSave}
          saving={saving}
        />
      ) : (
        <GenerateStoryForm
          onGenerated={handleGenerated}
          credits={credits}
          generateEndpoint="/api/stories/generate"
          onCreditsUsed={(_charged, remaining) => setCredits(remaining)}
        />
      )}
        </div>
      </div>
    </div>
  );
}
