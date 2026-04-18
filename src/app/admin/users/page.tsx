"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditTarget, setCreditTarget] = useState<UserRow | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditMode, setCreditMode] = useState<"grant" | "deduct">("grant");
  const [submitting, setSubmitting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreditSubmit() {
    if (!creditTarget || !creditAmount) return;
    setSubmitting(true);
    const amount = creditMode === "grant"
      ? Math.abs(Number(creditAmount))
      : -Math.abs(Number(creditAmount));

    const res = await fetch(`/api/admin/users/${creditTarget.id}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note: creditNote || undefined }),
    });

    if (res.ok) {
      setCreditTarget(null);
      setCreditAmount("");
      setCreditNote("");
      await fetchUsers();
    }
    setSubmitting(false);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="bg-background text-foreground">
      <div className="px-4 pb-16 pt-10 sm:px-10">
        <div className="mx-auto max-w-[1360px] space-y-8">
      <div>
        <div className="mb-[18px] flex items-center gap-2.5">
          <div className="h-px w-10 bg-ink" />
          <span className="mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
            Admin &middot; Users
          </span>
        </div>
        <Link href="/admin" className="mb-2 inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground">
          &larr; Back to admin
        </Link>
        <h1 className="display text-3xl font-black sm:text-[44px]" style={{ letterSpacing: "-0.02em" }}>
          User <em className="font-medium italic text-primary">management</em>.
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{users.length} registered users</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 storybook-shadow sm:p-5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {u.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold truncate">{u.name}</p>
                  {u.role === "admin" && (
                    <Badge className="text-xs">Admin</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Joined {formatDate(u.createdAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold">{u.credits}</p>
                <p className="text-xs text-muted-foreground">credits</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg text-kid-green hover:text-kid-green"
                  onClick={() => { setCreditTarget(u); setCreditMode("grant"); }}
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg text-kid-orange hover:text-kid-orange"
                  onClick={() => { setCreditTarget(u); setCreditMode("deduct"); }}
                >
                  <Minus className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg"
                  render={<Link href={`/admin/users/${u.id}/transactions`} />}
                >
                  <History className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={creditTarget !== null}
        onOpenChange={(open) => { if (!open) setCreditTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditMode === "grant" ? "Grant" : "Deduct"} Credits
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {creditMode === "grant" ? "Add" : "Remove"} credits for{" "}
              <strong className="text-foreground">{creditTarget?.name}</strong>{" "}
              (current: {creditTarget?.credits})
            </p>
            <Input
              type="number"
              min={1}
              placeholder="Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="rounded-xl"
            />
            <Input
              placeholder="Note (optional)"
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditTarget(null)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleCreditSubmit}
              disabled={submitting || !creditAmount || Number(creditAmount) <= 0}
              className="rounded-lg"
            >
              {submitting
                ? "Processing..."
                : creditMode === "grant"
                  ? `Grant ${creditAmount || 0} credits`
                  : `Deduct ${creditAmount || 0} credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}
