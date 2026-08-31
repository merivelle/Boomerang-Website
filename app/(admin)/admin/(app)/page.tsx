import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function counts() {
  const db = await supabaseServer();

  const [all, live, needsPoster, featured, hero, clients, recent, unread] = await Promise.all([
    db.from("projects").select("id", { count: "exact", head: true }),
    db.from("projects").select("id", { count: "exact", head: true })
      .eq("published", true).not("still_media_id", "is", null),
    db.from("projects").select("id", { count: "exact", head: true })
      .eq("published", true).is("still_media_id", null),
    db.from("projects").select("id", { count: "exact", head: true })
      .not("featured_rank", "is", null),
    db.from("projects").select("id", { count: "exact", head: true })
      .not("hero_rank", "is", null),
    db.from("clients").select("id", { count: "exact", head: true }).eq("published", true),
    db.from("projects").select("slug,title,studio,year,created_at")
      .order("created_at", { ascending: false }).limit(5),
    db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return {
    all: all.count ?? 0,
    live: live.count ?? 0,
    needsPoster: needsPoster.count ?? 0,
    featured: featured.count ?? 0,
    hero: hero.count ?? 0,
    clients: clients.count ?? 0,
    recent: (recent.data ?? []) as Array<{ slug: string; title: string; studio: string; year: number }>,
    unread: unread.count ?? 0,
  };
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="admin-label">{label}</p>
      <p className="mt-2 text-3xl tabular-nums tracking-[-0.02em] text-zinc-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default async function Dashboard() {
  const c = await counts();

  return (
    <>
      <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Everything on the website, at a glance.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Credits on the site" value={c.live} hint="Live and visible" />
        <Stat
          label="Needs a poster"
          value={c.needsPoster}
          hint={c.needsPoster ? "Hidden until an image is added" : "Nothing waiting"}
        />
        <Stat label="Selected Work" value={c.featured} hint="On the homepage list" />
        <Stat
          label="New messages"
          value={c.unread}
          hint={c.unread ? "Waiting for a reply" : "Nothing new"}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="admin-label">Recently added</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {c.recent.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/admin/work/${p.slug}`}
                  className="flex items-baseline justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <span className="truncate text-sm text-zinc-900">{p.title}</span>
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {p.studio} · <span className="tabular-nums">{p.year}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="admin-label">Quick actions</h2>
          <div className="mt-3 space-y-2">
            <Link
              href="/admin/work/new"
              className="block rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              + Add work
            </Link>
            <Link
              href="/admin/work"
              className="block rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm text-zinc-700 transition-colors hover:border-zinc-400"
            >
              Manage all work
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm text-zinc-700 transition-colors hover:border-zinc-400"
            >
              View website ↗
            </a>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-zinc-500">
            {c.all} credits in total — {c.live} on the site, {c.hero} in the
            homepage hero. Credits without a poster stay hidden until you add one.
          </p>
        </section>
      </div>
    </>
  );
}
