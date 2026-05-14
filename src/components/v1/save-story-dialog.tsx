"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, useSession } from "@/lib/auth-client";
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
  /** Title of the just-generated story — shown in the dialog header so the
   *  parent knows what they're saving. */
  storyTitle: string;
  /** From the v1 config's mainCharacterName. When set, the parent already
   *  signalled they want a child profile (the back-end auto-creates one). */
  childName?: string;
}

export function SaveStoryDialog({
  open,
  onOpenChange,
  draftId,
  storyTitle,
  childName,
}: SaveStoryDialogProps) {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const isAuthenticated = Boolean(session?.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  // Authenticated path: no signup needed — just hit the existing claim
  // endpoint, which also runs as a transaction server-side.
  async function handleAuthenticatedClaim() {
    try {
      const res = await fetch(`/api/v1/drafts/${draftId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyName: storyTitle,
          ...(childName ? { childName } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save your story. Try again.");
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      router.push(`/v1/done${data.storyId ? `?storyId=${data.storyId}` : ""}`);
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  // Anonymous path: standard signUp.email. A databaseHooks.user.create.after
  // hook on the server picks up the guest cookie, claims the draft, and
  // creates the child profile — all in one transaction tied to user creation.
  // If anything fails, the user is rolled back (compensating delete).
  async function handleSignup() {
    const { error: authError } = await signUp.email({ name, email, password });
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
    // Hook already claimed the draft. The done page can look up the latest
    // story for the now-signed-in user.
    router.push("/v1/done");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailAlreadyExists(false);

    if (isAuthenticated) {
      await handleAuthenticatedClaim();
    } else {
      await handleSignup();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-xl font-black" style={{ letterSpacing: "-0.02em" }}>
            {isAuthenticated ? "Save this story" : "Create a free account to save this story"}
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated
              ? `Saving “${storyTitle}” to ${session?.user?.email ?? "your account"}.`
              : <>Saving <span className="font-semibold text-foreground">“{storyTitle}”</span> — your dashboard will be ready in seconds.</>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAuthenticated && !sessionLoading && (
            <>
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

              {childName && (
                <p className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                  We&rsquo;ll also create a profile for{" "}
                  <span className="font-semibold text-foreground">{childName}</span>{" "}
                  with the age, interests, and language you picked. Edit anytime in your dashboard.
                </p>
              )}
            </>
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
            disabled={loading || sessionLoading}
            className="w-full rounded-full py-5 text-base font-bold"
          >
            {loading ? "Saving your story…" : "Save my story"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
