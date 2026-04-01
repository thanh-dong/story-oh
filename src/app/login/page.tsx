"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
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
          Sign in with a magic link sent to your email
        </p>

        {success ? (
          <div className="w-full rounded-xl border bg-card p-6 text-center">
            <p className="text-4xl" aria-hidden="true">
              📬
            </p>
            <p className="mt-3 text-lg font-bold">
              Check your email for the magic link!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a sign-in link to <strong>{email}</strong>
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
              {loading ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
