"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SaveStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId: string;
  defaultStoryName: string;
}

export function SaveStoryDialog({
  open,
  onOpenChange,
  draftId,
  defaultStoryName,
}: SaveStoryDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storyName, setStoryName] = useState(defaultStoryName);
  const [addChild, setAddChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailAlreadyExists(false);

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
      callbackURL: "/v1/done",
    });

    if (authError) {
      setLoading(false);
      const msg = authError.message ?? "";
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists") ||
        authError.status === 422 ||
        authError.status === 409
      ) {
        setEmailAlreadyExists(true);
      } else {
        setError(msg || "Signup failed. Please try again.");
      }
      return;
    }

    // Signup succeeded — claim the draft
    try {
      await fetch(`/api/v1/drafts/${draftId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyName,
          ...(addChild && childName.trim() ? { childName: childName.trim() } : {}),
        }),
      });
    } catch {
      // claim is best-effort; don't block navigation on failure
    }

    router.push("/v1/done");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-xl font-black" style={{ letterSpacing: "-0.02em" }}>
            Create a free account to save this story
          </DialogTitle>
          <DialogDescription>
            Your story will be waiting for you in your dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="save-name" className="text-sm font-semibold">
              Your name
            </Label>
            <Input
              id="save-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="save-email" className="text-sm font-semibold">
              Email
            </Label>
            <Input
              id="save-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="save-password" className="text-sm font-semibold">
              Password
            </Label>
            <Input
              id="save-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="save-story-name" className="text-sm font-semibold">
              Story name
            </Label>
            <Input
              id="save-story-name"
              value={storyName}
              onChange={(e) => setStoryName(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={addChild}
              onChange={(e) => setAddChild(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium">Create child profile</span>
          </label>

          {addChild && (
            <div className="space-y-1.5 pl-6">
              <Label htmlFor="save-child-name" className="text-sm font-semibold">
                Child&rsquo;s name
              </Label>
              <Input
                id="save-child-name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Child's first name"
                className="rounded-xl"
              />
            </div>
          )}

          {emailAlreadyExists && (
            <div className="rounded-xl bg-muted px-4 py-3 text-sm">
              This email is already registered.{" "}
              <Link
                href={`/login?redirect=/v1/preview/${draftId}`}
                className="font-semibold text-primary hover:underline"
              >
                Log in to save this story
              </Link>
              .
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-5 text-base font-bold"
          >
            {loading ? "Saving your story…" : "Save my story"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
