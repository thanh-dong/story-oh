import { db } from "@/lib/db";
import { children } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function verifyChildOwnership(childId: string, userId: string) {
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.parentId, userId)));
  return child ?? null;
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
