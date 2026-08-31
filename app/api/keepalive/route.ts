import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps the Supabase project awake.
 *
 * Free projects pause after roughly a week of no database activity, and a
 * cached site edited once a month is exactly that traffic profile — the public
 * pages serve from Next's cache and may not touch the database for days.
 * Unpausing is a dashboard action nobody should have to know about, so a daily
 * read prevents the situation instead.
 *
 * Deliberately the smallest possible query, and deliberately the anon key: if
 * this can read, so can the site.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 500 });
  }

  const started = Date.now();
  try {
    const res = await fetch(`${url}/rest/v1/categories?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, ms: Date.now() - started },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, ms: Date.now() - started });
  } catch {
    return NextResponse.json({ ok: false, error: "unreachable" }, { status: 502 });
  }
}
