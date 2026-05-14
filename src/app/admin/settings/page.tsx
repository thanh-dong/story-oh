import Link from "next/link";
import {
  CONFIG_KEYS,
  getConfigNumber,
} from "@/lib/app-config";
import { DEFAULT_MAX_DRAFTS_PER_WINDOW } from "@/lib/v1-rate-limit";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const v1MaxDraftsPerWindow = await getConfigNumber(
    CONFIG_KEYS.v1MaxDraftsPerWindow,
    DEFAULT_MAX_DRAFTS_PER_WINDOW,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
        <span>/</span>
        <span className="text-foreground">Settings</span>
      </div>

      <h1
        className="display text-3xl font-black"
        style={{ letterSpacing: "-0.02em" }}
      >
        Settings
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tunable runtime configuration. Changes take effect on the next request — no deploy needed.
      </p>

      <SettingsForm
        initial={{ v1MaxDraftsPerWindow }}
        defaults={{ v1MaxDraftsPerWindow: DEFAULT_MAX_DRAFTS_PER_WINDOW }}
      />
    </div>
  );
}
