"use client";

import { useEffect } from "react";
import { emitV1 } from "@/lib/v1-telemetry";

export function DoneTelemetry({ storyId }: { storyId?: string }) {
  useEffect(() => {
    emitV1("v1.account_completed", storyId ? { storyId } : {});
  }, [storyId]);
  return null;
}
