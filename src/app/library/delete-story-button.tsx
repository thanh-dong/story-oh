"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function DeleteStoryButton({
  storyId,
  storyTitle,
}: {
  storyId: string;
  storyTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
    setDeleting(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Story</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{storyTitle}</strong>?
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="rounded-lg">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
