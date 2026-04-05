import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { VocabularyManageClient } from "./client";

export default async function VocabularyManagePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { childId } = await params;
  const child = await verifyChildOwnership(childId, session.user.id);
  if (!child) redirect("/dashboard");

  const age = calculateAge(child.dateOfBirth);

  const plans = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.childId, childId));

  const activePlan = plans.find(
    (p) => p.status === "active" || p.status === "approved"
  );
  const draftPlan = plans.find((p) => p.status === "draft");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="lg"
            className="min-h-[44px] rounded-xl"
            render={<Link href={`/dashboard/${childId}`} />}
          >
            <ArrowLeft className="size-5" data-icon="inline-start" />
            Back to {child.name}
          </Button>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Vocabulary for {child.name}
        </h1>
      </div>

      <VocabularyManageClient
        childId={childId}
        childAge={age}
        childName={child.name}
        learningLanguages={child.learningLanguages}
        activePlan={activePlan ?? null}
        draftPlan={draftPlan ?? null}
      />
    </div>
  );
}
