"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { CornerFold, Pill, ShelfLabel } from "@/components/editorial";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json();
});

interface DashboardData {
  children: {
    id: string;
    name: string;
    avatar: string;
    age: number;
    assignedCount: number;
    completedCount: number;
    inProgressCount: number;
  }[];
  activity: {
    id: string;
    childName: string;
    storyTitle: string;
    isCompleted: boolean;
    page: number;
    createdAt: string | null;
  }[];
  stats: {
    totalDone: number;
    totalReading: number;
    totalChildren: number;
  };
}

export function DashboardClient() {
  const { data, error, isLoading } = useSWR<DashboardData>("/api/dashboard", fetcher);
  const router = useRouter();

  useEffect(() => {
    if (error) router.push("/login");
  }, [error, router]);

  if (error || isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const { children: childrenWithStats, activity, stats } = data;

  return (
    <>
      {/* Summary strip */}
      <div className="px-4 pt-8 sm:px-10">
        <div className="mx-auto grid max-w-[1360px] grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Adventures read", value: String(stats.totalDone), color: "var(--kid-orange)" },
            { label: "Words learned", value: "—", color: "var(--kid-purple)" },
            { label: "Stories in progress", value: String(stats.totalReading), color: "var(--kid-green)" },
            { label: "Children", value: String(stats.totalChildren), color: "var(--kid-pink)" },
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

      {/* Children */}
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
                <DashChild key={child.id} {...child} />
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

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="px-4 pb-16 pt-7 sm:px-10">
          <div className="mx-auto max-w-[1360px]">
            <ShelfLabel roman="II" title="Recent pages" sub="What your family is reading" />
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {activity.map((row, i) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[80px_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 ${
                    i < activity.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="display text-lg font-extrabold" style={{ letterSpacing: "-0.01em" }}>
                    {row.childName}
                  </span>
                  <span className="text-sm">{row.storyTitle}</span>
                  <div>
                    <Pill tone={row.isCompleted ? "green" : "purple"}>
                      {row.isCompleted ? "completed" : `page ${row.page}`}
                    </Pill>
                  </div>
                  <span className="mono text-right text-[11px] tracking-[0.06em] text-muted-foreground">
                    {formatRelativeTime(row.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DashChild({
  id,
  name,
  age,
  avatar,
  assignedCount: assigned,
  completedCount: done,
  inProgressCount: progress,
}: {
  id: string;
  name: string;
  age: number;
  avatar: string;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
}) {
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
            style={{ background: color, boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.15)" }}
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
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Reading", value: String(progress), color: "var(--kid-orange)" },
            { label: "Done", value: String(done), color: "var(--kid-green)" },
            { label: "Assigned", value: String(assigned), color: "var(--kid-purple)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-parchment px-3 py-2.5">
              <div className="display text-[22px] font-black" style={{ color: s.color, letterSpacing: "-0.02em" }}>
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

function DashboardSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-8 pb-20 sm:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[14px] border border-border bg-parchment p-5">
              <div className="mb-2 h-3 w-24 rounded bg-muted" />
              <div className="h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="mt-10">
          <div className="mb-5 h-6 w-32 rounded bg-muted" />
          <div className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-[18px] border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-3.5">
                  <div className="size-[60px] rounded-2xl bg-muted" />
                  <div>
                    <div className="mb-2 h-5 w-24 rounded bg-muted" />
                    <div className="h-3 w-32 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
