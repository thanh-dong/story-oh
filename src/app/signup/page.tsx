import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Ornament } from "@/components/editorial";
import { BookCover } from "@/components/editorial";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/");

  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-background px-4 py-12 sm:flex-row sm:gap-16 sm:px-6 sm:py-0">
      {/* Left: decorative book composition */}
      <div className="relative mb-10 hidden h-[400px] w-[320px] sm:mb-0 sm:block">
        <div className="absolute left-4 top-8 w-[180px] -rotate-6">
          <BookCover title="Your Story Begins" palette={["#6E5FA8", "#3C2F6A"]} tall />
        </div>
        <div className="absolute bottom-8 right-4 w-[180px] rotate-3">
          <BookCover title="A New Chapter" palette={["#4D8F78", "#1F4F3F"]} tall />
        </div>
        <div className="absolute left-0 top-0">
          <Ornament kind="sun" size={28} color="var(--kid-yellow)" />
        </div>
        <div className="absolute bottom-4 right-0">
          <Ornament kind="diamond" size={18} color="var(--kid-pink)" />
        </div>
        <div className="absolute right-16 top-4">
          <Ornament kind="star" size={16} color="var(--kid-orange)" />
        </div>
      </div>

      {/* Right: form */}
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="h-px w-8 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              New Reader
            </span>
          </div>
          <h1
            className="display text-3xl font-black sm:text-[40px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Create your <em className="font-medium italic text-primary">account</em>.
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Join StoryTime to track your reading adventures
          </p>
        </div>

        <div className="rounded-[18px] border border-border bg-card p-6 shadow-card sm:p-8">
          <SignupForm hasGoogle={hasGoogle} isDev={isDev} />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>

        {/* Decorative ornaments */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Ornament kind="diamond" size={10} color="var(--kid-orange)" />
          <Ornament kind="star" size={12} color="var(--kid-yellow)" />
          <Ornament kind="diamond" size={10} color="var(--kid-pink)" />
        </div>
      </div>
    </div>
  );
}
