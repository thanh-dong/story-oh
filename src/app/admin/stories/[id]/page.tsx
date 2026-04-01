"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StoryForm } from "@/components/admin/story-form";
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
    return <p className="text-muted-foreground">Loading story...</p>;
  }

  if (!story) {
    return <p className="text-destructive">Story not found.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Edit Story</h1>
      <StoryForm initialData={story} onSave={handleSave} saving={saving} />
    </div>
  );
}
