"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ImagePlus } from "lucide-react";
import { TreeEditor } from "./tree-editor";
import type { StoryTree } from "@/lib/types";

interface StoryFormProps {
  initialData?: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
    require_login: boolean;
    story_tree: StoryTree;
  };
  onSave: (data: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
    require_login: boolean;
    story_tree: StoryTree;
  }) => void;
  saving: boolean;
}

const defaultStoryTree: StoryTree = {
  start: { text: "Once upon a time...", choices: [] },
};

export function StoryForm({ initialData, onSave, saving }: StoryFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [summary, setSummary] = useState(initialData?.summary ?? "");
  const [ageRange, setAgeRange] = useState(initialData?.age_range ?? "4-8");
  const [price, setPrice] = useState(initialData?.price ?? 0);
  const [coverImage, setCoverImage] = useState(
    initialData?.cover_image ?? ""
  );
  const [requireLogin, setRequireLogin] = useState(
    initialData?.require_login ?? false
  );
  const [storyTree, setStoryTree] = useState<StoryTree>(
    initialData?.story_tree ?? defaultStoryTree
  );
  const [generatingCover, setGeneratingCover] = useState(false);

  const handleGenerateCover = useCallback(async () => {
    if (!title.trim() || !summary.trim()) return;
    setGeneratingCover(true);
    try {
      const res = await fetch("/api/stories/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cover_image) setCoverImage(data.cover_image);
      }
    } catch {
      // silently fail
    } finally {
      setGeneratingCover(false);
    }
  }, [title, summary]);

  const handleSave = () => {
    onSave({
      title,
      summary,
      age_range: ageRange,
      price,
      cover_image: coverImage || null,
      require_login: requireLogin,
      story_tree: storyTree,
    });
  };

  const saveButton = (
    <Button
      onClick={handleSave}
      disabled={saving}
      className="w-full rounded-full py-5 text-base font-bold sm:w-auto sm:px-10"
    >
      {saving ? "Saving..." : "Save Story"}
    </Button>
  );

  return (
    <div className="space-y-8">
      {/* Top save button */}
      <div className="flex justify-end">{saveButton}</div>

      {/* Metadata section */}
      <div className="space-y-5 rounded-2xl bg-card p-5 storybook-shadow sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Story Details
        </p>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Great Adventure..."
            className="rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A brief description of the story..."
            rows={3}
            className="rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age-range">Age Range</Label>
            <Select value={ageRange} onValueChange={(value: string | null) => setAgeRange(value ?? "4-8")}>
              <SelectTrigger id="age-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4-8">4-8</SelectItem>
                <SelectItem value="8-12">8-12</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-image">Cover Image URL</Label>
          <div className="flex gap-2">
            <Input
              id="cover-image"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateCover}
              disabled={generatingCover || !title.trim() || !summary.trim()}
              className="shrink-0 rounded-xl"
            >
              {generatingCover ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">
                {generatingCover ? "Generating..." : "Generate"}
              </span>
            </Button>
          </div>
          {coverImage && (
            <img
              src={coverImage}
              alt="Cover preview"
              className="mt-2 h-32 w-full rounded-xl object-cover"
            />
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <input
            id="require-login"
            type="checkbox"
            checked={requireLogin}
            onChange={(e) => setRequireLogin(e.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          <Label htmlFor="require-login" className="text-sm">
            Require login to read this story
          </Label>
        </div>
      </div>

      {/* Tree editor section */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Story Tree
        </p>
        <TreeEditor value={storyTree} onChange={setStoryTree} />
      </div>

      {/* Bottom save button */}
      {saveButton}
    </div>
  );
}
