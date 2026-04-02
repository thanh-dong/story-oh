import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { HoldToExitButton } from "@/components/hold-to-exit-button";

export default async function KidModeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const age = calculateAge(child.dateOfBirth);
  const isYoung = age < 6;

  return (
    <div className={`kid-mode ${isYoung ? "kid-young" : ""}`}>
      <div className="sticky top-0 z-50 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{child.avatar}</span>
          <span className="text-lg font-bold">{child.name}</span>
        </div>
        <HoldToExitButton />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
