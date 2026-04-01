"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TreeEditor } from "./tree-editor";
import type { StoryTree } from "@/lib/types";

interface StoryFormProps {
  initialData?: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
    story_tree: StoryTree;
  };
  onSave: (data: {
    title: string;
    summary: string;
    age_range: string;
    price: number;
    cover_image: string | null;
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
  const [storyTree, setStoryTree] = useState<StoryTree>(
    initialData?.story_tree ?? defaultStoryTree
  );

  const handleSave = () => {
    onSave({
      title,
      summary,
      age_range: ageRange,
      price,
      cover_image: coverImage || null,
      story_tree: storyTree,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="age-range">Age Range</Label>
        <Select value={ageRange} onValueChange={(value) => setAgeRange(value ?? "4-8")}>
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover-image">Cover Image URL</Label>
        <Input
          id="cover-image"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Story Tree</Label>
        <TreeEditor value={storyTree} onChange={setStoryTree} />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
