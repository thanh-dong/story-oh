"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StoryForm } from "@/components/admin/story-form";
import type { Story } from "@/lib/types";

export default function UserEditStoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchStory() {
      const res = await fetch(`/api/stories/${id}`);
      if (res.ok) {
        setStory(await res.json());
      }
      setLoading(false);
    }
    fetchStory();
  }, [id]);

  async function handleSave(data: any) {
    setSaving(true);
    const res = await fetch(`/api/stories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push("/library");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse px-4 pt-10 pb-20 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 h-3 w-28 rounded bg-muted" />
          <div className="mb-8 h-10 w-64 rounded-lg bg-muted" />
          <div className="h-64 rounded-[18px] bg-muted" />
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20 text-center sm:px-10">
        <p className="display text-xl font-black">Story not found</p>
        <Link href="/library" className="text-sm font-semibold text-primary">
          &larr; Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Edit Story
            </span>
          </div>

          <Link href="/library" className="inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground">
            &larr; Back to library
          </Link>

          <h1 className="display text-3xl font-black sm:text-[44px]" style={{ letterSpacing: "-0.02em" }}>
            Edit <em className="font-medium italic text-primary">story</em>.
          </h1>

          <StoryForm initialData={story} onSave={handleSave} saving={saving} />
        </div>
      </div>
    </div>
  );
}
