"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
          Add Child
        </h1>
      </div>

      <ChildForm onSubmit={handleCreate} submitLabel="Add Child" />
    </div>
  );
}
