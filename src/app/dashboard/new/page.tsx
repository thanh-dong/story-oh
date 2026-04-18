"use client";

import Link from "next/link";
import { ChildForm } from "@/components/child-form";

export default function NewChildPage() {
  async function handleCreate(data: Record<string, unknown>) {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create child");
  }

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              New Reader
            </span>
          </div>

          <div className="mb-2">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              &larr; Back to dashboard
            </Link>
          </div>

          <h1
            className="display mb-8 text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Add a <em className="font-medium italic text-primary">child</em>.
          </h1>

          <div className="rounded-[18px] border border-border bg-card p-6 shadow-card sm:p-8">
            <ChildForm onSubmit={handleCreate} submitLabel="Add Child" />
          </div>
        </div>
      </div>
    </div>
  );
}
