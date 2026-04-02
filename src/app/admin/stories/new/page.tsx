"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StoryForm } from "@/components/admin/story-form";
import { GenerateStoryForm } from "@/components/admin/generate-story-form";
import type { GenerateStoryResponse, StoryTree } from "@/lib/types";

type Mode = "manual" | "generate";

export default function CreateStoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [generatedData, setGeneratedData] = useState<GenerateStoryResponse | null>(null);

  async function handleSave(data: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
    story_tree: StoryTree;
  }) {
    setSaving(true);
    const res = await fetch("/api/admin/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/admin");
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
        cover_image: null,
        story_tree: generatedData.story_tree,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Create New Story</h1>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode("generate")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "generate"
              ? "border-b-2 border-primary text-primary"
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
        <GenerateStoryForm onGenerated={handleGenerated} />
      )}
    </div>
  );
}
