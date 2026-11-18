"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/login?error=supabase");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    let active = true;

    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!currentUser) {
        router.replace("/login?next=/admin");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login?next=/admin");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setLoggingOut(true);
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <LoadingState label="Checking admin session…" />;
  }

  if (!user) {
    return <LoadingState label="Redirecting to login…" />;
  }

  return (
    <div className="space-y-5">
      <div className="surface-card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            Signed in
          </p>
          <p className="truncate text-sm font-medium text-brand-950" title={user.email ?? undefined}>
            {user.email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="btn-secondary min-h-11 shrink-0"
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Signing out…" : "Log out"}
        </button>
      </div>

      {children}
    </div>
  );
}
