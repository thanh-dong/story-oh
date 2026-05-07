"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GenerateStoryForm } from "@/components/admin/generate-story-form";
import { VariantPicker } from "@/components/admin/variant-picker";
import type { GenerateStoryResponse } from "@/lib/types";

export default function UserCreateStoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  const [variants, setVariants] = useState<GenerateStoryResponse[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [freeRegensRemaining, setFreeRegensRemaining] = useState(0);

  useEffect(() => {
    fetch("/api/me/credits")
      .then((r) => r.json())
      .then((d) => setCredits(d.credits))
      .catch(() => {});
  }, []);

  function handleGenerated(data: GenerateStoryResponse) {
    setVariants((prev) => {
      const next = [...prev, data];
      setSelectedIndex(next.length - 1);
      return next;
    });
    if (data.session_id) setSessionId(data.session_id);
    if (typeof data.free_regens_remaining === "number") {
      setFreeRegensRemaining(data.free_regens_remaining);
    }
  }

  async function handleSave() {
    const picked = variants[selectedIndex];
    if (!picked) return;
    setSaving(true);
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: picked.title,
        summary: picked.summary,
        age_range: picked.age_range,
        price: 0,
        cover_image: picked.cover_image ?? null,
        require_login: false,
        story_tree: picked.story_tree,
      }),
    });
    if (res.ok) {
      router.push("/library");
      return;
    }
    setSaving(false);
  }

  const hasVariants = variants.length > 0;
  const canRegenerateFree = sessionId !== null && freeRegensRemaining > 0;
  const submitLabel = !hasVariants
    ? undefined
    : canRegenerateFree
      ? `Regenerate (${freeRegensRemaining} free left)`
      : "Regenerate (no free regens left)";

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              New Story
            </span>
          </div>

          <Link
            href="/library"
            className="inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            &larr; Back to library
          </Link>

          <h1
            className="display text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Create a <em className="font-medium italic text-primary">story</em>.
          </h1>

          <p className="text-sm text-muted-foreground">
            Describe your idea and we&apos;ll generate it. After your first generation, you get{" "}
            <strong>2 free regenerations</strong> — pick the version you like best.
          </p>

          <GenerateStoryForm
            onGenerated={handleGenerated}
            credits={credits}
            generateEndpoint="/api/stories/generate"
            onCreditsUsed={(_charged, remaining) => setCredits(remaining)}
            sessionId={hasVariants ? sessionId : null}
            submitLabel={submitLabel}
            disabled={hasVariants && !canRegenerateFree}
          />

          {hasVariants && (
            <VariantPicker
              variants={variants}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
