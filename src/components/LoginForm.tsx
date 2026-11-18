"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const configError = searchParams.get("error") === "supabase";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    configError
      ? "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."
      : null
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Add your project URL and anon key to .env.local (or Vercel env)."
      );
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Incorrect email or password. Check your details and try again."
            : signInError.message
        );
        return;
      }

      router.replace(nextPath.startsWith("/") ? nextPath : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-7 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200">
          ExpoLead
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Admin login
        </h1>
        <p className="mt-2 text-sm text-brand-100">
          Sign in to view booth leads and export CSV.
        </p>
      </div>

      <div className="space-y-4 px-6 py-7">
        {error ? <ErrorBanner message={error} /> : null}

        <label className="block space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
            <Mail className="h-4 w-4 text-brand-600" />
            Email
          </span>
          <input
            className="input-field min-h-12"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
            <Lock className="h-4 w-4 text-brand-600" />
            Password
          </span>
          <input
            className="input-field min-h-12"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          className="btn-primary min-h-12 w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          Create the first admin in Supabase → Authentication → Users → Add user.
        </p>
      </div>
    </form>
  );
}
