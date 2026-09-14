"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Card, CardBody } from "./ui";

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
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[23rem]">
        <div className="mb-7 text-center">
          <p className="admin-eyebrow">Boomerang</p>
          <h1 className="admin-h1 mt-1">Website editor</h1>
        </div>

        <Card>
          <CardBody>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="admin-label mb-2">
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
            <label htmlFor="password" className="admin-label mb-2">
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
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-red-700"
            >
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" full loading={busy}>
            Sign in
          </Button>
        </form>
          </CardBody>
        </Card>

        <p className="admin-hint mt-6 text-center">
          Accounts are created by your developer. If you can&rsquo;t get in, ask
          them rather than trying to sign up — there is no public sign-up.
        </p>
      </div>
    </div>
  );
}
