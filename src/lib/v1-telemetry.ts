// Funnel events for Leo's /v1 onboarding.
// TODO(user): wire to a real sink (PostHog / Mixpanel / DB table).
// For now we emit to console so the funnel is observable in dev.

export type V1Event =
  | "v1.start"
  | "v1.preview_reached"
  | "v1.save_intent"
  | "v1.account_completed";

export interface V1EventPayload {
  draftId?: string;
  storyId?: string;
  [key: string]: unknown;
}

export function emitV1(event: V1Event, payload: V1EventPayload = {}): void {
  if (typeof window === "undefined") return;
  const record = { event, ts: Date.now(), ...payload };
  // eslint-disable-next-line no-console
  console.log("[v1-telemetry]", record);
}
