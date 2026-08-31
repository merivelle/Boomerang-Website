"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });

    if (error) {
      // Plain English, not the API's wording. "Invalid login credentials" sends
      // people hunting for a broken account when they have simply mistyped.
      setError(
        /invalid/i.test(error.message)
          ? "That email and password don't match. Check for typos and try again."
          : /network|fetch/i.test(error.message)
            ? "Can't reach the server. Check your connection and try again."
            : error.message,
      );
      setBusy(false);
      return;
    }

    router.replace(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[22rem]">
        <div className="mb-10">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-zinc-400">
            Boomerang
          </p>
          <h1 className="mt-1 text-2xl tracking-[-0.02em] text-zinc-900">
            Website editor
          </h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="admin-label mb-1.5 block">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="admin-label mb-1.5 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-input"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-xs leading-relaxed text-zinc-500">
          Accounts are created by your developer. If you can&rsquo;t get in, ask
          them rather than trying to sign up — there is no public sign-up.
        </p>
      </div>
    </div>
  );
}
