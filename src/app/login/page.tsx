"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMagicLink(null);

    const res = await fetch("/api/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/auth/callback`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      setMagicLink(data.link);
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center py-12 sm:py-20">
      <div className="w-full max-w-sm animate-fade-up space-y-6">
        <div className="text-center">
          <span className="inline-block text-5xl" aria-hidden="true">&#x1F4D6;</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome to StoryTime
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to save your reading progress
          </p>
        </div>

        {magicLink ? (
          <div className="animate-scale-in rounded-2xl bg-parchment p-6 text-center storybook-shadow">
            <span className="text-4xl" aria-hidden="true">&#x2728;</span>
            <p className="mt-3 text-lg font-bold">
              Your magic link is ready!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click below to sign in as <strong>{email}</strong>
            </p>
            <a
              href={magicLink}
              className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign In Now
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-card p-6 storybook-shadow"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-xl"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-full text-base font-bold">
              {loading ? "Sending..." : "Get Magic Link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
