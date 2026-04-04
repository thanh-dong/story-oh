"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  de: "German",
};

interface CreatePlanDialogProps {
  childId: string;
  childAge: number;
  learningLanguages: string[];
  onCreated: () => void;
}

export function CreatePlanDialog({
  childId,
  childAge,
  learningLanguages,
  onCreated,
}: CreatePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(learningLanguages[0] || "en");
  const [weeks, setWeeks] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordsPerWeek = childAge <= 6 ? 25 : childAge <= 9 ? 35 : 45;
  const estimatedCost = Math.round(
    3 + wordsPerWeek * Number(weeks) * 0.15
  );

  async function handleCreate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vocabulary/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          learningLanguage: language,
          weeksRequested: Number(weeks),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create plan");
        return;
      }

      setOpen(false);
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Vocabulary Plan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Vocabulary Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Learning Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {learningLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang] || lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Number of Weeks</Label>
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    {w} week{w > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>
              Estimated cost: <strong>{estimatedCost} credits</strong>
            </p>
            <p className="text-muted-foreground">
              Credits are charged when you approve the plan.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Generating plan..." : "Generate Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
