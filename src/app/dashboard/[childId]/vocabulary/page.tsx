import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { vocabularyPlans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
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
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Vocabulary Plan
            </span>
          </div>

          <Link
            href={`/dashboard/${childId}`}
            className="mb-2 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            &larr; Back to {child.name}
          </Link>

          <h1
            className="display mb-8 text-3xl font-black sm:text-[44px]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Vocabulary for <em className="font-medium italic text-primary">{child.name}</em>.
          </h1>

          <VocabularyManageClient
            childId={childId}
            childAge={age}
            childName={child.name}
            learningLanguages={child.learningLanguages}
            activePlan={activePlan ?? null}
            draftPlan={draftPlan ?? null}
          />
        </div>
      </div>
    </div>
  );
}
