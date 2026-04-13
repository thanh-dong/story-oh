import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children, childStories, stories, userStories } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChildCard } from "@/components/child-card";
import { calculateAge } from "@/lib/children";
import type { StoryTree } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const childrenList = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.user.id));

  const childrenWithStats = await Promise.all(
    childrenList.map(async (child) => {
      const assigned = await db
        .select({ count: sql<number>`count(*)` })
        .from(childStories)
        .where(eq(childStories.childId, child.id));

      const progressRows = await db
        .select()
        .from(userStories)
        .innerJoin(stories, eq(userStories.story_id, stories.id))
        .where(
          and(
            eq(userStories.user_id, session.user.id),
            eq(userStories.child_id, child.id)
          )
        );

      let completedCount = 0;
      let inProgressCount = 0;
      for (const row of progressRows) {
        const currentNode = row.user_stories.progress?.current_node ?? "start";
        const storyTree = row.stories.story_tree as StoryTree;
        const node = storyTree[currentNode];
        if (node && node.choices.length === 0) {
          completedCount++;
        } else {
          inProgressCount++;
        }
      }

      return {
        ...child,
        age: calculateAge(child.dateOfBirth),
        assignedCount: Number(assigned[0]?.count ?? 0),
        completedCount,
        inProgressCount,
      };
    })
  );

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Family Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your children&apos;s learning
        </p>
      </div>

      {childrenWithStats.length > 0 ? (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {childrenWithStats.map((child) => (
            <ChildCard
              key={child.id}
              id={child.id}
              name={child.name}
              avatar={child.avatar}
              age={child.age}
              assignedCount={child.assignedCount}
              completedCount={child.completedCount}
              inProgressCount={child.inProgressCount}
            />
          ))}

          <Link href="/dashboard/new" className="group block">
            <article className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/25 p-6 transition-all duration-300 hover:border-primary/50 hover:bg-muted/30">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Plus className="size-7" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary">
                Add Child
              </span>
            </article>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-parchment py-20 text-center">
          <span className="text-6xl" aria-hidden="true">{"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}"}</span>
          <div className="space-y-2">
            <p className="text-xl font-bold">Set up your family</p>
            <p className="text-muted-foreground">
              Add your children to create personalized learning experiences
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button size="lg" className="rounded-full px-8 text-lg font-bold">
              <Plus className="size-5" data-icon="inline-start" />
              Add Your First Child
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
