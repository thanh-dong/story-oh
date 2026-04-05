import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ChildCardProps {
  id: string;
  name: string;
  avatar: string;
  age: number;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
}

export function ChildCard({
  id,
  name,
  avatar,
  age,
  assignedCount,
  completedCount,
  inProgressCount,
}: ChildCardProps) {
  return (
    <Link href={`/dashboard/${id}`} className="group block">
      <article className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated">
        <span className="text-5xl transition-transform duration-300 group-hover:scale-110">
          {avatar}
        </span>
        <div className="text-center">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm text-muted-foreground">Age {age}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {assignedCount} {assignedCount === 1 ? "story" : "stories"}
          </Badge>
          {completedCount > 0 && (
            <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
              {completedCount} done
            </Badge>
          )}
          {inProgressCount > 0 && (
            <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
              {inProgressCount} reading
            </Badge>
          )}
        </div>
      </article>
    </Link>
  );
}
