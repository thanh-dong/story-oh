import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/");

  const hasGoogle = !!process.env.GOOGLE_CLIENT_ID;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center px-4 py-12 sm:px-6 sm:py-20">
      <div className="w-full max-w-sm animate-fade-up space-y-6">
        <div className="text-center">
          <span className="inline-block text-5xl" aria-hidden="true">&#x2728;</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Create an Account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Join StoryTime to track your reading adventures
          </p>
        </div>

        <SignupForm hasGoogle={hasGoogle} isDev={isDev} />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
