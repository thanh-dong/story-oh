import type { GuestDraftConfig } from "@/lib/db/schema";

export type AgeBand = GuestDraftConfig["ageBand"];

// Midpoint years for each band. Used when we need a concrete DOB but only have
// a band — the parent can adjust later in the dashboard.
const BAND_MIDPOINT_YEARS: Record<AgeBand, number> = {
  "4-6": 5,
  "6-8": 7,
  "8-12": 10,
};

export function ageBandToDateOfBirth(band: AgeBand, today: Date = new Date()): string {
  const years = BAND_MIDPOINT_YEARS[band];
  const dob = new Date(today);
  dob.setFullYear(dob.getFullYear() - years);
  // Drizzle `date` column expects ISO YYYY-MM-DD
  return dob.toISOString().slice(0, 10);
}

export function dobToAgeBand(dob: string | Date, today: Date = new Date()): AgeBand {
  const dobDate = typeof dob === "string" ? new Date(dob) : dob;
  let age = today.getFullYear() - dobDate.getFullYear();
  const m = today.getMonth() - dobDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
  if (age <= 5) return "4-6";
  if (age <= 7) return "6-8";
  return "8-12";
}
