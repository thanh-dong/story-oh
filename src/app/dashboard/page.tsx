import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { children, childStories, stories, userStories } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { CornerFold, Pill, ShelfLabel } from "@/components/editorial";
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

  // Aggregate stats
  const totalDone = childrenWithStats.reduce((s, c) => s + c.completedCount, 0);
  const totalReading = childrenWithStats.reduce((s, c) => s + c.inProgressCount, 0);

  // Recent activity from userStories (most recent first)
  const recentActivity = await db
    .select()
    .from(userStories)
    .innerJoin(stories, eq(userStories.story_id, stories.id))
    .innerJoin(children, eq(userStories.child_id, children.id))
    .where(eq(userStories.user_id, session.user.id))
    .orderBy(desc(userStories.created_at))
    .limit(4);

  return (
    <div className="bg-background">
      {/* ─── Header ─── */}
      <div className="px-4 pb-5 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <div className="h-px w-10 bg-ink" />
            <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
              Chapter III &middot; The Family
            </span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1
                className="display m-0 text-4xl font-black leading-[0.98] sm:text-[64px]"
                style={{ letterSpacing: "-0.03em" }}
              >
                Your{" "}
                <em className="font-medium text-primary" style={{ fontStyle: "italic" }}>
                  family
                </em>{" "}
                bookshelf.
              </h1>
              <p className="mt-3.5 text-[15px] text-muted-foreground">
                Manage children&rsquo;s plans, track progress, and assign new stories.
              </p>
            </div>
            <Link href="/dashboard/new">
              <Button size="lg" className="rounded-full bg-primary px-6 text-base font-bold text-white">
                + Add child
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Summary strip ─── */}
      <div className="px-4 pt-8 sm:px-10">
        <div className="mx-auto grid max-w-[1360px] grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Adventures read", value: String(totalDone), color: "var(--kid-orange)" },
            { label: "Words learned", value: "—", color: "var(--kid-purple)" },
            { label: "Stories in progress", value: String(totalReading), color: "var(--kid-green)" },
            { label: "Children", value: String(childrenWithStats.length), color: "var(--kid-pink)" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[14px] border border-border bg-parchment p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {stat.label}
              </div>
              <div
                className="display mt-1.5 text-[34px] font-black leading-none"
                style={{ color: stat.color, letterSpacing: "-0.03em" }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Children ─── */}
      {childrenWithStats.length > 0 ? (
        <div className="px-4 pt-9 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <ShelfLabel
              roman="I"
              title="Children"
              sub={`${childrenWithStats.length} reader${childrenWithStats.length === 1 ? "" : "s"} · tap to open their plan`}
            />
            <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {childrenWithStats.map((child) => (
                <DashChild
                  key={child.id}
                  id={child.id}
                  name={child.name}
                  age={child.age}
                  avatar={child.avatar}
                  assigned={child.assignedCount}
                  done={child.completedCount}
                  progress={child.inProgressCount}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-9 sm:px-10">
          <div className="mx-auto flex max-w-[1360px] flex-col items-center gap-6 rounded-2xl bg-parchment py-20 text-center">
            <span className="text-6xl" aria-hidden="true">
              {"\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}"}
            </span>
            <div className="space-y-2">
              <p className="text-xl font-bold">Set up your family</p>
              <p className="text-muted-foreground">
                Add your children to create personalized learning experiences
              </p>
            </div>
            <Link href="/dashboard/new">
              <Button size="lg" className="rounded-full px-8 text-lg font-bold">
                + Add Your First Child
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ─── Recent activity ─── */}
      {recentActivity.length > 0 && (
        <div className="px-4 pb-16 pt-7 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <ShelfLabel roman="II" title="Recent pages" sub="What your family is reading" />
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {recentActivity.map((row, i) => {
                const currentNode = row.user_stories.progress?.current_node ?? "start";
                const tree = row.stories.story_tree as StoryTree;
                const node = tree[currentNode];
                const isCompleted = node && node.choices.length === 0;
                const tone = isCompleted ? "green" as const : "purple" as const;
                const act = isCompleted ? "completed" : `page ${row.user_stories.progress?.history?.length ?? 1}`;

                return (
                  <div
                    key={row.user_stories.id}
                    className={`grid grid-cols-[80px_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 ${
                      i < recentActivity.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="display text-lg font-extrabold" style={{ letterSpacing: "-0.01em" }}>
                      {row.children.name}
                    </span>
                    <span className="text-sm">{row.stories.title}</span>
                    <div>
                      <Pill tone={tone}>{act}</Pill>
                    </div>
                    <span className="mono text-right text-[11px] tracking-[0.06em] text-muted-foreground">
                      {formatRelativeTime(row.user_stories.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashChild({
  id,
  name,
  age,
  avatar,
  assigned,
  done,
  progress,
}: {
  id: string;
  name: string;
  age: number;
  avatar: string;
  assigned: number;
  done: number;
  progress: number;
}) {
  // Assign a kid-color based on name hash
  const colors = [
    "oklch(0.87 0.16 85 / 0.4)",
    "oklch(0.70 0.16 155 / 0.4)",
    "oklch(0.65 0.18 290 / 0.4)",
    "oklch(0.68 0.19 350 / 0.4)",
    "oklch(0.73 0.17 55 / 0.4)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];

  return (
    <Link href={`/dashboard/${id}`} className="group block">
      <div className="relative rounded-[18px] border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated">
        <CornerFold />
        <div className="mb-[18px] flex items-center gap-3.5">
          <div
            className="grid size-[60px] place-items-center rounded-2xl text-[30px]"
            style={{
              background: color,
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.15)",
            }}
          >
            {avatar}
          </div>
          <div>
            <h3 className="display text-2xl font-extrabold" style={{ letterSpacing: "-0.02em" }}>
              {name}
            </h3>
            <div className="text-[13px] text-muted-foreground">
              Age {age} &middot; {assigned} stories assigned
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Reading", value: String(progress), color: "var(--kid-orange)" },
            { label: "Done", value: String(done), color: "var(--kid-green)" },
            { label: "Assigned", value: String(assigned), color: "var(--kid-purple)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-parchment px-3 py-2.5">
              <div
                className="display text-[22px] font-black"
                style={{ color: s.color, letterSpacing: "-0.02em" }}
              >
                {s.value}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

function formatRelativeTime(dateStr: string | Date | null): string {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}
