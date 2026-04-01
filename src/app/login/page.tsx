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
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-5xl" aria-hidden="true">
          🔑
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Welcome Back!
        </h1>

        <p className="text-center text-muted-foreground">
          Enter your email to get a sign-in link
        </p>

        {magicLink ? (
          <div className="w-full rounded-xl border bg-card p-6 text-center">
            <p className="text-4xl" aria-hidden="true">
              🔗
            </p>
            <p className="mt-3 text-lg font-bold">
              Dev Magic Link
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click the link below to sign in as <strong>{email}</strong>
            </p>
            <a
              href={magicLink}
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/80"
            >
              Sign In Now
            </a>
            <p className="mt-3 break-all rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {magicLink}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="w-full flex flex-col gap-4 rounded-xl border bg-card p-6"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Generating..." : "Get Magic Link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
