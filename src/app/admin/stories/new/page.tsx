"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StoryForm } from "@/components/admin/story-form";

export default function CreateStoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSave(data: any) {
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Create New Story</h1>
      <StoryForm onSave={handleSave} saving={saving} />
    </div>
  );
}
