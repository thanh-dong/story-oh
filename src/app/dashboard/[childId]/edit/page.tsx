"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChildForm } from "@/components/child-form";
import type { Child } from "@/lib/types";

export default function EditChildPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/children/${childId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setChild)
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [childId, router]);

  async function handleUpdate(data: Record<string, unknown>) {
    const res = await fetch(`/api/children/${childId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!child) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 animate-fade-up">
        <Button
          variant="ghost"
          size="lg"
          className="min-h-[44px] rounded-xl"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-5" data-icon="inline-start" />
          Back
        </Button>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Edit {child.name}
        </h1>
      </div>

      <ChildForm
        initialData={{
          name: child.name,
          dateOfBirth: child.dateOfBirth,
          avatar: child.avatar,
          nativeLanguage: child.nativeLanguage,
          learningLanguages: child.learningLanguages,
          interests: child.interests,
          dailyGoalMinutes: child.dailyGoalMinutes,
        }}
        onSubmit={handleUpdate}
        submitLabel="Save Changes"
      />
    </div>
  );
}
