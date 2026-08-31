"use client";
import { createBrowserClient } from "@supabase/ssr";

// The anon key only. RLS is what limits this client, and it is public by design.
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
