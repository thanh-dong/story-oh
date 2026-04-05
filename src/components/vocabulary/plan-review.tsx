"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { VocabularyPlan, VocabularyWordEntry } from "@/lib/vocabulary-types";
import { X, Pencil, Check, Plus } from "lucide-react";

interface PlanReviewProps {
  planId: string;
  plan: VocabularyPlan;
  creditsCost: number;
  status: string;
  editable?: boolean;
  onApproved: () => void;
  onRegenerated: () => void;
  onPlanUpdated?: (plan: VocabularyPlan) => void;
}

export function PlanReview({
  planId,
  plan: initialPlan,
  creditsCost,
  status,
  editable = false,
  onApproved,
  onRegenerated,
  onPlanUpdated,
}: PlanReviewProps) {
  const [plan, setPlan] = useState<VocabularyPlan>(initialPlan);
  const [loading, setLoading] = useState<"approve" | "regenerate" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [topicValue, setTopicValue] = useState("");
  const [addingWord, setAddingWord] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  function updatePlan(newPlan: VocabularyPlan) {
    setPlan(newPlan);
    setHasChanges(true);
  }

  function handleRemoveWord(weekNum: number, dayNum: number, wordIndex: number) {
    const newPlan = structuredClone(plan);
    const week = newPlan.weeks.find((w) => w.weekNumber === weekNum);
    const day = week?.days.find((d) => d.day === dayNum);
    if (day && day.words.length > 1) {
      day.words.splice(wordIndex, 1);
      updatePlan(newPlan);
    }
  }

  function handleEditTopic(weekNum: number, dayNum: number) {
    const key = `${weekNum}-${dayNum}`;
    const week = plan.weeks.find((w) => w.weekNumber === weekNum);
    const day = week?.days.find((d) => d.day === dayNum);
    if (day) {
      setEditingTopic(key);
      setTopicValue(day.topic);
    }
  }

  function handleSaveTopic(weekNum: number, dayNum: number) {
    if (!topicValue.trim()) return;
    const newPlan = structuredClone(plan);
    const week = newPlan.weeks.find((w) => w.weekNumber === weekNum);
    const day = week?.days.find((d) => d.day === dayNum);
    if (day) {
      day.topic = topicValue.trim();
      updatePlan(newPlan);
    }
    setEditingTopic(null);
  }

  function handleAddWord(weekNum: number, dayNum: number) {
    if (!newWord.trim()) return;
    const newPlan = structuredClone(plan);
    const week = newPlan.weeks.find((w) => w.weekNumber === weekNum);
    const day = week?.days.find((d) => d.day === dayNum);
    if (day) {
      const entry: VocabularyWordEntry = {
        word: newWord.trim(),
        emoji: "📝",
        pronunciation: "",
        promptSentence: newWord.trim(),
      };
      day.words.push(entry);
      updatePlan(newPlan);
    }
    setNewWord("");
    setAddingWord(null);
  }

  async function handleSave() {
    setLoading("save");
    setError(null);
    try {
      const res = await fetch(`/api/vocabulary/plans/${planId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      setHasChanges(false);
      onPlanUpdated?.(plan);
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleApprove() {
    if (hasChanges) {
      await handleSave();
    }
    setLoading("approve");
    setError(null);
    try {
      const res = await fetch(`/api/vocabulary/plans/${planId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to approve");
        return;
      }
      onApproved();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function handleRegenerate() {
    if (
      !confirm("Regenerating will cost additional credits. Continue?")
    )
      return;

    setLoading("regenerate");
    setError(null);
    try {
      const res = await fetch(
        `/api/vocabulary/plans/${planId}/regenerate`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to regenerate");
        return;
      }
      onRegenerated();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {plan.weeks.map((week) => (
        <div key={week.weekNumber} className="space-y-3">
          <h3 className="font-bold text-lg">Week {week.weekNumber}</h3>
          <div className="space-y-2">
            {week.days.map((day) => {
              const dayKey = `${week.weekNumber}-${day.day}`;
              return (
                <div
                  key={dayKey}
                  className={`rounded-xl border-l-4 ${day.isReview ? "border-kid-purple/40" : "border-primary/30"} bg-card p-4 shadow-card`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">Day {day.day}</span>
                    <span className="text-muted-foreground">—</span>
                    {editable && editingTopic === dayKey ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={topicValue}
                          onChange={(e) => setTopicValue(e.target.value)}
                          className="h-7 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTopic(week.weekNumber, day.day);
                            if (e.key === "Escape") setEditingTopic(null);
                          }}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleSaveTopic(week.weekNumber, day.day)}
                        >
                          <Check className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <span
                        className={editable ? "cursor-pointer hover:underline" : ""}
                        onClick={() => editable && handleEditTopic(week.weekNumber, day.day)}
                      >
                        {day.topic}
                      </span>
                    )}
                    {editable && editingTopic !== dayKey && (
                      <button
                        onClick={() => handleEditTopic(week.weekNumber, day.day)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}
                    {day.isReview && (
                      <Badge variant="secondary">Review</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {day.words.map((w, i) => (
                      <span
                        key={`${w.word}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm group"
                      >
                        {w.emoji} {w.word}
                        {editable && day.words.length > 1 && (
                          <button
                            onClick={() => handleRemoveWord(week.weekNumber, day.day, i)}
                            className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {editable && (
                      addingWord === dayKey ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder="New word..."
                            className="h-7 w-28 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddWord(week.weekNumber, day.day);
                              if (e.key === "Escape") { setAddingWord(null); setNewWord(""); }
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleAddWord(week.weekNumber, day.day)}
                          >
                            <Check className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingWord(dayKey)}
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="size-3" /> Add
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {status === "draft" && (
        <div className="flex gap-3 flex-wrap">
          {editable && hasChanges && (
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={loading !== null}
            >
              {loading === "save" ? "Saving..." : "Save Changes"}
            </Button>
          )}
          <Button
            onClick={handleApprove}
            disabled={loading !== null}
          >
            {loading === "approve"
              ? "Approving..."
              : `Approve (${creditsCost} credits)`}
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={loading !== null}
          >
            {loading === "regenerate" ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      )}

      {status === "approved" && (
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="font-semibold">Preparing audio...</p>
          <p className="text-sm text-muted-foreground">
            The plan will be ready for your child shortly.
          </p>
        </div>
      )}
    </div>
  );
}
