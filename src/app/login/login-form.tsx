"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  isDev,
  hasGoogle,
}: {
  isDev: boolean;
  hasGoogle: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await signIn.email({
      email,
      password,
      callbackURL: next,
    });

    if (authError) {
      setError(authError.message ?? "Invalid email or password");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  async function handleDevLogin(devEmail: string, devPassword: string) {
    setLoading(true);
    setError(null);
    const { error: authError } = await signIn.email({
      email: devEmail,
      password: devPassword,
      callbackURL: next,
    });
    if (authError) {
      setError(authError.message ?? "Failed to sign in");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-card p-6 storybook-shadow"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="rounded-xl"
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
          className="w-full rounded-full text-base font-bold"
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        {hasGoogle && (
          <>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => signIn.social({ provider: "google", callbackURL: next })}
              disabled={loading}
            >
              Continue with Google
            </Button>
          </>
        )}
      </form>

      {isDev && (
        <div className="rounded-2xl border border-dashed border-kid-orange/40 bg-kid-yellow/10 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-kid-orange">
            Dev Accounts
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-lg text-xs"
              onClick={() => handleDevLogin("admin@test.com", "password123")}
              disabled={loading}
            >
              Admin
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-lg text-xs"
              onClick={() => handleDevLogin("user@test.com", "password123")}
              disabled={loading}
            >
              User
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
