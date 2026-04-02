"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StoryForm } from "@/components/admin/story-form";
import { Button } from "@/components/ui/button";
import type { Story } from "@/lib/types";

export default function EditStoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchStory() {
      const res = await fetch("/api/admin/stories");
      if (res.ok) {
        const stories: Story[] = await res.json();
        const found = stories.find((s) => s.id === id) ?? null;
        setStory(found);
      }
      setLoading(false);
    }
    fetchStory();
  }, [id]);

  async function handleSave(data: any) {
    setSaving(true);
    const res = await fetch(`/api/admin/stories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/admin");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
        <span className="text-5xl" aria-hidden="true">&#x1F50D;</span>
        <p className="text-lg font-semibold">Story not found</p>
        <Link href="/admin">
          <Button variant="outline" className="rounded-full">Back to Stories</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-lg" render={<Link href="/admin" />}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Edit Story
        </h1>
      </div>
      <StoryForm initialData={story} onSave={handleSave} saving={saving} />
    </div>
  );
}
