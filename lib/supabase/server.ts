import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * The signed-in editor's own client. Every write goes through this, so RLS is
 * the thing that decides what they may change — not the admin UI, which is
 * only a convenience on top of it.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Bypasses RLS entirely. Only for work no user performs: inserting a contact
 * inquiry, and admin operations that must not depend on the caller's role.
 * Never import this from anything that runs in the browser.
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(URL, key, { auth: { persistSession: false } });
}

export type Profile = { id: string; email: string; display_name: string | null; role: "editor" | "developer" };

/** The signed-in editor, or null. Reads profiles, so an auth user without a profile row is not an admin. */
export async function currentUser(): Promise<Profile | null> {
  const db = await supabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data } = await db.from("profiles").select("*").eq("id", auth.user.id).single();
  return (data as Profile) ?? null;
}
