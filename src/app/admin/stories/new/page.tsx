"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StoryForm } from "@/components/admin/story-form";
import { GenerateStoryForm } from "@/components/admin/generate-story-form";
import { Button } from "@/components/ui/button";
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
    require_login: boolean;
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
        cover_image: generatedData.cover_image ?? null,
        require_login: false,
        story_tree: generatedData.story_tree,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-lg" render={<Link href="/admin" />}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Create Story
        </h1>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted p-1">
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
        <GenerateStoryForm onGenerated={handleGenerated} />
      )}
    </div>
  );
}
