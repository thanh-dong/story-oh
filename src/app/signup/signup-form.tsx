"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm({ hasGoogle, isDev }: { hasGoogle: boolean; isDev: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await signUp.email({
      name,
      email,
      password,
      callbackURL: next,
    });

    if (authError) {
      setError(authError.message ?? "Signup failed");
      setLoading(false);
    } else if (isDev) {
      router.push(next);
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[14px] bg-parchment p-6 text-center">
        <div className="display text-4xl font-black text-primary">&#x2713;</div>
        <p className="mt-3 text-lg font-bold">Account created!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your email to verify your account, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-sm font-semibold">
          Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="rounded-xl border-border"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-email" className="text-sm font-semibold">
          Email
        </Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="rounded-xl border-border"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password" className="text-sm font-semibold">
          Password
        </Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          className="rounded-xl border-border"
        />
      </div>

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
        {loading ? "Creating account..." : "Create Account"}
      </Button>

      {hasGoogle && (
        <>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="mono bg-card px-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                or
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full py-5 text-base font-semibold"
            onClick={() => signIn.social({ provider: "google", callbackURL: "/" })}
            disabled={loading}
          >
            Continue with Google
          </Button>
        </>
      )}
    </form>
  );
}
