"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsFormProps {
  initial: { v1MaxDraftsPerWindow: number };
  defaults: { v1MaxDraftsPerWindow: number };
}

export function SettingsForm({ initial, defaults }: SettingsFormProps) {
  const [maxDrafts, setMaxDrafts] = useState<string>(
    String(initial.v1MaxDraftsPerWindow),
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseInt(maxDrafts, 10);
  const isValid =
    Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;
  const isDirty =
    isValid && parsed !== initial.v1MaxDraftsPerWindow;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ v1MaxDraftsPerWindow: parsed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save");
        return;
      }
      setSavedAt(new Date());
      // sync local "initial" by reloading the page server data
      window.location.reload();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="display text-lg font-extrabold text-ink">
            /v1 onboarding flow
          </h2>
          <p className="text-sm text-muted-foreground">
            Limits applied to anonymous users on the warm-lead funnel under /v1.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="v1MaxDrafts" className="text-sm font-semibold text-ink">
            Free story previews before signup
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="v1MaxDrafts"
              type="number"
              min={0}
              max={100}
              step={1}
              value={maxDrafts}
              onChange={(e) => setMaxDrafts(e.target.value)}
              className="w-32 rounded-xl"
              aria-describedby="v1MaxDrafts-hint"
            />
            <span className="text-sm text-muted-foreground">per cookie + IP, per 24h</span>
          </div>
          <p id="v1MaxDrafts-hint" className="text-xs text-muted-foreground">
            How many anonymous story generations a visitor can create before being asked to sign up.{" "}
            <span className="font-semibold">0</span> = unlimited.{" "}
            <span className="font-semibold">Default: {defaults.v1MaxDraftsPerWindow}</span>.
          </p>
          {!isValid && (
            <p className="text-xs text-destructive">
              Must be an integer between 0 and 100.
            </p>
          )}
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="rounded-xl border border-kid-green/30 bg-kid-green/5 px-4 py-2.5 text-sm">
          Saved at {savedAt.toLocaleTimeString()}.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes." : "All up to date."}
        </p>
        <Button
          type="submit"
          disabled={!isValid || !isDirty || saving}
          className="rounded-full px-6 py-5 text-sm font-bold"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
