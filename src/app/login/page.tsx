import { redirect } from "next/navigation";
import { BookOpen, Star, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  const isDev = process.env.NODE_ENV === "development";
  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-12 sm:flex-row sm:gap-12 sm:py-0">
      <div className="hidden sm:flex sm:w-1/2 sm:items-center sm:justify-center">
        <div className="relative flex size-64 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 via-kid-purple/20 to-kid-pink/10">
          <BookOpen className="size-16 text-primary/60" />
          <Star className="absolute right-4 top-4 size-6 text-kid-yellow animate-pulse" />
          <Sparkles className="absolute bottom-6 left-4 size-5 text-kid-pink/60" />
        </div>
      </div>
      <div className="w-full max-w-sm animate-fade-up space-y-6 rounded-2xl bg-card p-6 shadow-card sm:p-8">
        <div className="text-center">
          <span className="inline-block text-5xl" aria-hidden="true">&#x1F4D6;</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Welcome to StoryTime
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to save your reading progress
          </p>
        </div>

        <LoginForm isDev={isDev} hasGoogle={hasGoogle} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
