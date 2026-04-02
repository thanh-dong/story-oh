"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string | null;
  created_at: string;
}

export default function UserTransactionsPage() {
  const { id } = useParams<{ id: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/admin/users/${id}/transactions`);
      if (res.ok) setTransactions(await res.json());
      setLoading(false);
    }
    fetch_();
  }, [id]);

  function formatDate(d: string) {
    return new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function typeBadge(type: string) {
    const variants: Record<string, { label: string; className: string }> = {
      generation: { label: "Generation", className: "bg-primary/10 text-primary" },
      admin_grant: { label: "Grant", className: "bg-kid-green/20 text-kid-green" },
      admin_deduct: { label: "Deduct", className: "bg-kid-orange/20 text-kid-orange" },
      signup_bonus: { label: "Signup", className: "bg-kid-yellow/20 text-kid-orange" },
    };
    const v = variants[type] ?? { label: type, className: "" };
    return <Badge className={`border-0 text-xs font-semibold ${v.className}`}>{v.label}</Badge>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-lg" render={<Link href="/admin/users" />}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Transaction History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {transactions.length} transactions
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : transactions.length > 0 ? (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 storybook-shadow"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {typeBadge(tx.type)}
                  <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
                </div>
                {tx.description && (
                  <p className="mt-1 text-sm text-muted-foreground truncate">{tx.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-bold ${tx.amount > 0 ? "text-kid-green" : "text-kid-orange"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </p>
                <p className="text-xs text-muted-foreground">bal: {tx.balance_after}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-parchment py-16 text-center">
          <span className="text-5xl" aria-hidden="true">&#x1F4CB;</span>
          <p className="text-lg font-semibold">No transactions yet</p>
        </div>
      )}
    </div>
  );
}
