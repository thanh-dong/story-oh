"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GenerateStoryResponse } from "@/lib/types";

interface GenerateStoryFormProps {
  onGenerated: (data: GenerateStoryResponse) => void;
}

export function GenerateStoryForm({ onGenerated }: GenerateStoryFormProps) {
  const [keyword, setKeyword] = useState("");
  const [audienceAge, setAudienceAge] = useState<"4-8" | "8-12">("4-8");
  const [isForChildren, setIsForChildren] = useState(true);
  const [expectedReadingTime, setExpectedReadingTime] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [minBranches, setMinBranches] = useState(2);
  const [maxBranches, setMaxBranches] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          audienceAge,
          isForChildren,
          expectedReadingTime,
          difficulty,
          minBranches,
          maxBranches,
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const data: GenerateStoryResponse = await res.json();
      onGenerated(data);
    } catch (err) {
      const message = err instanceof Error
        ? err.name === "TimeoutError"
          ? "Request timed out. Please try again."
          : err.message
        : "Generation failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="keyword">Target Keyword</Label>
        <Input
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g., dragons, space exploration, friendship"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-age-range">Audience Age</Label>
        <Select value={audienceAge} onValueChange={(v: string | null) => setAudienceAge((v as "4-8" | "8-12") ?? "4-8")}>
          <SelectTrigger id="gen-age-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4-8">4-8</SelectItem>
            <SelectItem value="8-12">8-12</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is-for-children"
          type="checkbox"
          checked={isForChildren}
          onChange={(e) => setIsForChildren(e.target.checked)}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor="is-for-children">Content safe for children</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reading-time">Expected Reading Time (minutes)</Label>
        <Input
          id="reading-time"
          type="number"
          min={1}
          max={30}
          value={expectedReadingTime}
          onChange={(e) => setExpectedReadingTime(Math.max(1, Math.min(30, Number(e.target.value))))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gen-difficulty">Difficulty</Label>
        <Select value={difficulty} onValueChange={(v: string | null) => setDifficulty((v as "easy" | "medium" | "hard") ?? "medium")}>
          <SelectTrigger id="gen-difficulty">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min-branches">Min Branches</Label>
          <Input
            id="min-branches"
            type="number"
            min={1}
            max={maxBranches}
            value={minBranches}
            onChange={(e) => setMinBranches(Math.max(1, Math.min(maxBranches, Number(e.target.value))))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-branches">Max Branches</Label>
          <Input
            id="max-branches"
            type="number"
            min={minBranches}
            max={20}
            value={maxBranches}
            onChange={(e) => setMaxBranches(Math.max(minBranches, Math.min(20, Number(e.target.value))))}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={loading || !keyword.trim()}>
        {loading ? "Generating your story..." : "Generate Story"}
      </Button>
    </div>
  );
}
