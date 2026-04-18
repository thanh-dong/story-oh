"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!child) return null;

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Edit Profile
            </span>
          </div>

          <Link
            href={`/dashboard/${childId}`}
            className="mb-2 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            &larr; Back to {child.name}
          </Link>

          <h1
            className="display mb-8 text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Edit <em className="font-medium italic text-primary">{child.name}</em>.
          </h1>

          <div className="rounded-[18px] border border-border bg-card p-6 shadow-card sm:p-8">
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
        </div>
      </div>
    </div>
  );
}
