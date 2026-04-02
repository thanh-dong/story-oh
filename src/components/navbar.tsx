"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { BookOpen, Library, LogIn, LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  // Lazily create the Supabase client (only in the browser)
  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Get the initial session
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight transition-transform hover:scale-[1.03] sm:text-2xl"
        >
          <span className="text-2xl sm:text-3xl" role="img" aria-label="open book">
            &#x1F4D6;
          </span>
          <span className="text-foreground">
            Story<span className="text-primary">Time</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="ghost"
            size="lg"
            className="min-h-[44px] min-w-[44px] rounded-xl text-base font-semibold"
            render={<Link href="/explore" />}
          >
            <BookOpen className="size-5" data-icon="inline-start" />
            Explore
          </Button>

          {user && (
            <Button
              variant="ghost"
              size="lg"
              className="min-h-[44px] min-w-[44px] rounded-xl text-base font-semibold"
              render={<Link href="/library" />}
            >
              <Library className="size-5" data-icon="inline-start" />
              My Library
            </Button>
          )}

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {user.email?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <Button
                variant="outline"
                size="lg"
                className="min-h-[44px] rounded-xl text-base font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="size-5" data-icon="inline-start" />
                Logout
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              className="ml-2 min-h-[44px] rounded-xl text-base font-semibold"
              render={<Link href="/login" />}
            >
              <LogIn className="size-5" data-icon="inline-start" />
              Login
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon-lg"
          className="min-h-[44px] min-w-[44px] rounded-xl sm:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="size-6" />
          ) : (
            <Menu className="size-6" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background px-4 pb-4 pt-2 sm:hidden">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="lg"
              className="min-h-[44px] w-full justify-start rounded-xl text-base font-semibold"
              render={<Link href="/explore" />}
              onClick={() => setMobileMenuOpen(false)}
            >
              <BookOpen className="size-5" data-icon="inline-start" />
              Explore
            </Button>

            {user && (
              <Button
                variant="ghost"
                size="lg"
                className="min-h-[44px] w-full justify-start rounded-xl text-base font-semibold"
                render={<Link href="/library" />}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Library className="size-5" data-icon="inline-start" />
                My Library
              </Button>
            )}

            {user ? (
              <>
                <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted-foreground">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user.email?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <span className="truncate">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-[44px] w-full justify-start rounded-xl text-base font-semibold"
                  onClick={handleLogout}
                >
                  <LogOut className="size-5" data-icon="inline-start" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="min-h-[44px] w-full justify-start rounded-xl text-base font-semibold"
                render={<Link href="/login" />}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="size-5" data-icon="inline-start" />
                Login
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
