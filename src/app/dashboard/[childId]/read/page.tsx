import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { childStories, stories, userStories, vocabularyPlans } from "@/lib/db/schema";
import { and, eq, or, isNull, inArray } from "drizzle-orm";
import { verifyChildOwnership, calculateAge } from "@/lib/children";
import { BookCover, Pill, Ornament } from "@/components/editorial";
import type { Story, StoryTree } from "@/lib/types";

const coverPalettes: [string, string][] = [
  ["#D98A5B", "#8E3A2B"], ["#6E5FA8", "#3C2F6A"], ["#4D8F78", "#1F4F3F"],
  ["#C88A3F", "#7A3E1F"], ["#4D728F", "#1F3B52"], ["#8A5893", "#432948"],
];
function getPalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return coverPalettes[Math.abs(hash) % coverPalettes.length];
}

function isAtEnding(storyTree: StoryTree, currentNode: string): boolean {
  const node = storyTree[currentNode];
  return node ? node.choices.length === 0 : false;
}

export default async function ChildReadingHubPage({
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

  const vocabRows = await db
    .select()
    .from(vocabularyPlans)
    .where(eq(vocabularyPlans.childId, childId));

  const activePlan = vocabRows.find((p) => p.status === "active");
  const approvedPlan = vocabRows.find((p) => p.status === "approved");
  const vocabPlan = activePlan || approvedPlan;

  const assignedRows = await db
    .select({ storyId: childStories.storyId })
    .from(childStories)
    .where(eq(childStories.childId, childId));
  const assignedIds = assignedRows.map((r) => r.storyId);

  const conditions = [
    isNull(stories.created_by),
    eq(stories.created_by, session.user.id),
  ];
  if (assignedIds.length > 0) {
    conditions.push(inArray(stories.id, assignedIds));
  }

  const storyList = await db.select().from(stories).where(or(...conditions));

  const progressRows = await db
    .select()
    .from(userStories)
    .where(and(eq(userStories.user_id, session.user.id), eq(userStories.child_id, childId)));
  const progressMap = new Map(progressRows.map((r) => [r.story_id, r.progress]));

  const assignedStories = storyList.map((story) => ({
    story: story as Story,
    progress: progressMap.get(story.id) ?? null,
  }));

  const sorted = assignedStories.sort((a, b) => {
    const statusOrder = (s: typeof a) => {
      if (s.progress && !isAtEnding(s.story.story_tree, s.progress.current_node)) return 0;
      if (!s.progress) return 1;
      return 2;
    };
    return statusOrder(a) - statusOrder(b);
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <span className="text-5xl sm:text-6xl">{child.avatar}</span>
        <div>
          <h1 className="display text-2xl font-black sm:text-3xl" style={{ letterSpacing: "-0.02em" }}>
            Hi {child.name}!
          </h1>
          <Pill tone="primary">Age {age}</Pill>
        </div>
      </div>

      {/* Vocabulary CTA */}
      {vocabPlan && vocabPlan.status === "active" && (
        <Link href={`/dashboard/${childId}/read/vocabulary/${vocabPlan.id}`} className="block">
          <div className="relative overflow-hidden rounded-[18px] p-6 text-white shadow-card transition-all hover:-translate-y-1" style={{ background: "linear-gradient(135deg, var(--kid-yellow), var(--kid-orange))" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="display text-4xl font-black">A</div>
                <div>
                  <h2 className="display text-xl font-black">Today&rsquo;s Words</h2>
                  <p className="text-sm text-white/80">{vocabPlan.wordsTotal} words to learn</p>
                </div>
              </div>
              <ArrowRight className="size-6 text-white/60" />
            </div>
          </div>
        </Link>
      )}

      {/* Stories grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[18px] bg-parchment py-16 text-center">
          <Ornament kind="star" size={40} color="var(--kid-yellow)" />
          <p className="display text-xl font-black">No stories yet!</p>
          <p className="text-sm text-muted-foreground">Ask your parent to pick some stories for you.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorted.map(({ story, progress }) => {
            const isDone = progress && isAtEnding(story.story_tree, progress.current_node);
            const isReading = progress && !isDone;
            const palette = getPalette(story.title);

            return (
              <Link key={story.id} href={`/dashboard/${childId}/read/${story.id}`} className="group block">
                <article className="relative overflow-hidden rounded-[18px] border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated">
                  {story.cover_image ? (
                    <div className="relative h-[140px] w-full overflow-hidden">
                      <Image src={story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                    </div>
                  ) : (
                    <BookCover title={story.title} palette={palette} />
                  )}
                  <div className="p-4">
                    <div className="mb-1.5">
                      {isDone && <Pill tone="green">&#x2713; Done</Pill>}
                      {isReading && <Pill tone="primary">Reading</Pill>}
                    </div>
                    <h3 className="display text-lg font-extrabold" style={{ letterSpacing: "-0.01em" }}>
                      {story.title}
                    </h3>
                    <div className="mt-3">
                      <span className={`inline-block rounded-full px-5 py-2 text-sm font-bold ${
                        isDone ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
                      }`}>
                        {isReading ? "Continue" : isDone ? "Read Again" : "Start Reading"}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
