"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGradient, getStoryEmoji } from "@/lib/gradients";
import type { Story } from "@/lib/types";

export default function AdminPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchStories() {
    setLoading(true);
    const res = await fetch("/api/admin/stories");
    if (res.ok) {
      const data = await res.json();
      setStories(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStories();
  }, []);

  function countNodes(story: Story): number {
    return Object.keys(story.story_tree ?? {}).length;
  }

  function countEndings(story: Story): number {
    const tree = story.story_tree ?? {};
    return Object.values(tree).filter(
      (node) => !node.choices || node.choices.length === 0
    ).length;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/stories/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDeleteTarget(null);
      await fetchStories();
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Stories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stories.length} {stories.length === 1 ? "story" : "stories"} in your library
          </p>
        </div>
        <Link href="/admin/stories/new">
          <Button className="rounded-full font-bold">
            <Plus className="size-4" data-icon="inline-start" />
            New Story
          </Button>
        </Link>
      </div>

      {/* Stories grid */}
      {loading ? (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : stories.length > 0 ? (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => {
            const gradient = getGradient(story.title);
            const emoji = getStoryEmoji(story.title);

            return (
              <article
                key={story.id}
                className="group relative overflow-hidden rounded-2xl bg-card storybook-shadow transition-all duration-300 hover:-translate-y-0.5 hover:storybook-shadow-lg"
              >
                {/* Cover */}
                <div
                  className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}
                >
                  <span className="text-4xl drop-shadow-md" aria-hidden="true">
                    {emoji}
                  </span>
                  <Badge className="absolute left-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                    {story.age_range}
                  </Badge>
                  {story.require_login && (
                    <Badge className="absolute right-3 top-3 border-0 bg-white/25 text-white backdrop-blur-sm text-xs font-bold">
                      &#x1F512;
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold leading-snug tracking-tight">
                    {story.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {story.summary}
                  </p>

                  {/* Stats row */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span>{countNodes(story)} pages</span>
                    <span>&middot;</span>
                    <span>{countEndings(story)} endings</span>
                    <span>&middot;</span>
                    <span>{formatDate(story.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <Link href={`/admin/stories/${story.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-lg text-xs font-semibold"
                      >
                        <Pencil className="size-3" data-icon="inline-start" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(story)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">&#x1F4DD;</span>
          <p className="text-lg font-semibold">No stories yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first interactive story
          </p>
          <Link href="/admin/stories/new">
            <Button className="mt-2 rounded-full px-6 font-bold">
              <Plus className="size-4" data-icon="inline-start" />
              Create Story
            </Button>
          </Link>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Story</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{deleteTarget?.title}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
