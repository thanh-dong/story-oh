"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, Shield, X } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Pill, Ornament } from "@/components/editorial";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
] as const;

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user || user.role === "admin") return;

    function fetchCredits() {
      fetch("/api/me/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits))
        .catch(() => {});
    }

    fetchCredits();

    window.addEventListener("credits-updated", fetchCredits);
    return () => window.removeEventListener("credits-updated", fetchCredits);
  }, [user]);

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          setMobileMenuOpen(false);
          router.refresh();
        },
      },
    });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between px-4 sm:h-16 sm:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="display grid size-[34px] place-items-center rounded-[10px] bg-ink text-[20px] font-black italic text-background">
            S
          </div>
          <span className="display text-[22px] font-extrabold" style={{ letterSpacing: "-0.02em" }}>
            Story<span className="italic text-primary">Time</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-7 text-sm font-semibold sm:flex">
          {navLinks.map(({ href, label }) => {
            // Show Dashboard and Library only when logged in
            if ((href === "/dashboard" || href === "/library") && !user) return null;
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={isActive ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}
              >
                {label}
              </Link>
            );
          })}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={
                pathname.startsWith("/admin")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-3 sm:flex">
          <ThemeToggle />
          {user && credits !== null && (
            <Pill tone="yellow" icon={<Ornament kind="star" size={12} color="var(--kid-orange)" />}>
              {credits} &#x2726;
            </Pill>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user.email?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" data-icon="inline-start" />
                Logout
              </Button>
            </div>
          ) : (
            <Button size="sm" render={<Link href="/login" />}>
              Sign in
            </Button>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-lg"
            className="min-h-[44px] min-w-[44px] rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 sm:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map(({ href, label }) => {
              if ((href === "/dashboard" || href === "/library") && !user) return null;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
                >
                  {label}
                </Link>
              );
            })}
            {user?.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
              >
                <Shield className="size-5" />
                Admin
              </Link>
            )}
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                  <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user.email?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
                >
                  <LogOut className="size-5" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-ink px-3 py-3 text-base font-semibold text-background"
              >
                <LogIn className="size-5" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
