"use client";

import { useState, useCallback } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Child } from "@/lib/types";

interface ShareStoryDialogProps {
  storyId: string;
  children: Child[];
  assignedChildIds: string[];
}

export function ShareStoryDialog({
  storyId,
  children: childrenList,
  assignedChildIds,
}: ShareStoryDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(assignedChildIds)
  );
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        // Reset selection to current assignments when opening
        setSelected(new Set(assignedChildIds));
      }
    },
    [assignedChildIds]
  );

  const toggle = (childId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const original = new Set(assignedChildIds);

      // Children that need to be assigned (added)
      const toAdd = [...selected].filter((id) => !original.has(id));
      // Children that need to be unassigned (removed)
      const toRemove = [...original].filter((id) => !selected.has(id));

      await Promise.all([
        ...toAdd.map((childId) =>
          fetch(`/api/children/${childId}/stories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyId }),
          })
        ),
        ...toRemove.map((childId) =>
          fetch(`/api/children/${childId}/stories/${storyId}`, {
            method: "DELETE",
          })
        ),
      ]);

      setOpen(false);
    } catch {
      // Silently handle errors — the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full bg-white/25 text-white backdrop-blur-sm hover:bg-white/40"
          />
        }
      >
        <Users className="size-3.5" />
        <span className="sr-only">Share with children</span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with Children</DialogTitle>
          <DialogDescription>
            Choose which children can access this story.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {childrenList.map((child) => {
            const isSelected = selected.has(child.id);
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => toggle(child.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{child.avatar}</span>
                <span className="text-xs font-semibold truncate max-w-full">
                  {child.name}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
