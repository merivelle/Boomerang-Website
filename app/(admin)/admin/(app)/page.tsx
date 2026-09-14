import Link from "next/link";
import {
  Building2,
  Clock,
  Eye,
  Film,
  ImageOff,
  LayoutDashboard,
  Mail,
  Plus,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { ButtonLink, Card, CardBody, CardHeader, PageTitle, cn } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
// Without its own title this page falls back to the route group's default,
// which the root layout's "%s — Boomerang" template then appends to again.
export const metadata = { title: "Dashboard" };

async function counts() {
  const db = await supabaseServer();

  const [live, needsPoster, missingInfo, featured, hero, clients, unread, recent, drafts] =
    await Promise.all([
      db
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .not("still_media_id", "is", null),
      db
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .is("still_media_id", null),
      // A blank search description is not a gap — the site writes one from the
      // film's own details. A missing trailer link is: it is what makes the
      // poster clickable.
      db
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .is("trailer_url", null),
      db.from("projects").select("id", { count: "exact", head: true }).not("featured_rank", "is", null),
      db.from("projects").select("id", { count: "exact", head: true }).not("hero_rank", "is", null),
      db.from("clients").select("id", { count: "exact", head: true }).eq("published", true),
      db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      db
        .from("projects")
        .select("slug,title,studio,year,created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      listDrafts(db),
    ]);

  return {
    live: live.count ?? 0,
    needsPoster: needsPoster.count ?? 0,
    missingInfo: missingInfo.count ?? 0,
    featured: featured.count ?? 0,
    hero: hero.count ?? 0,
    clients: clients.count ?? 0,
    unread: unread.count ?? 0,
    recent: (recent.data ?? []) as Array<{ slug: string; title: string; studio: string; year: number }>,
    drafts,
  };
}

/**
 * Every number is a link.
 *
 * "42 need a poster" used to be a fact with nowhere to go. Each tile now opens
 * the screen already filtered to exactly the thing it is counting, which is the
 * difference between a report and a to-do list.
 */
function Stat({
  href,
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "warning" | "draft" | "info";
}) {
  const accent = {
    neutral: "text-zinc-400",
    warning: "text-amber-500",
    draft: "text-violet-500",
    info: "text-blue-500",
  }[tone];

  return (
    <Link
      href={href}
      className="group admin-card block p-5 transition-all hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="admin-label">{label}</p>
        <Icon className={cn("h-4 w-4 shrink-0", value > 0 ? accent : "text-zinc-300")} />
      </div>
      <p className="mt-2 text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.03em] text-zinc-900">
        {value}
      </p>
      <p className="admin-hint mt-1.5 group-hover:text-zinc-700">{hint}</p>
    </Link>
  );
}

export default async function Dashboard() {
  const c = await counts();

  return (
    <>
      <PageTitle
        title="Dashboard"
        description="Everything on the website, at a glance. Every number opens the list behind it."
        action={
          <ButtonLink href="/admin/work/new" variant="primary">
            <Plus className="h-4 w-4" />
            Add work
          </ButtonLink>
        }
      />

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          href="/admin/work?status=live"
          label="Credits on the site"
          value={c.live}
          hint="Live and visible to visitors"
          icon={Film}
        />
        <Stat
          href="/admin/work?status=missing-poster"
          label="Need a poster"
          value={c.needsPoster}
          hint={c.needsPoster ? "Hidden until an image is added" : "Nothing waiting"}
          icon={ImageOff}
          tone="warning"
        />
        <Stat
          href="/admin/publish"
          label="Not published yet"
          value={c.drafts.length}
          hint={c.drafts.length ? "Waiting for you to publish" : "The site is up to date"}
          icon={UploadCloud}
          tone="draft"
        />
        <Stat
          href="/admin/messages"
          label="New messages"
          value={c.unread}
          hint={c.unread ? "Waiting for a reply" : "Nothing new"}
          icon={Mail}
          tone="info"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          href="/admin/work?status=featured"
          label="In Selected Work"
          value={c.featured}
          hint="The numbered homepage list"
          icon={Sparkles}
        />
        <Stat
          href="/admin/homepage"
          label="In the homepage hero"
          value={c.hero}
          hint={c.hero === 6 ? "All six slots filled" : `${6 - c.hero} slots still empty`}
          icon={LayoutDashboard}
          tone={c.hero === 6 ? "neutral" : "warning"}
        />
        <Stat
          href="/admin/clients"
          label="Clients"
          value={c.clients}
          hint="On the client wall"
          icon={Building2}
        />
        <Stat
          href="/admin/work?status=missing-info"
          label="No trailer link"
          value={c.missingInfo}
          hint={c.missingInfo ? "Their poster isn't clickable" : "Every credit links to a trailer"}
          icon={Clock}
          tone="warning"
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title={c.drafts.length ? "Waiting to be published" : "Recently added"}
            description={
              c.drafts.length
                ? "Changes you've made that visitors can't see yet."
                : "The newest credits on the site."
            }
            action={
              c.drafts.length ? (
                <ButtonLink size="sm" variant="primary" href="/admin/publish">
                  Review &amp; publish
                </ButtonLink>
              ) : (
                <ButtonLink size="sm" href="/admin/work">
                  All work
                </ButtonLink>
              )
            }
          />

          {c.drafts.length ? (
            <ul className="divide-y divide-zinc-100">
              {c.drafts.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9375rem] text-zinc-900">{d.label}</span>
                    {d.summary && <span className="admin-hint block truncate">{d.summary}</span>}
                  </span>
                  <span className="shrink-0 text-[0.75rem] text-zinc-400">{ago(d.updated_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {c.recent.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/admin/work/${p.slug}`}
                    className="flex items-baseline justify-between gap-4 px-5 py-3 transition-colors hover:bg-zinc-50"
                  >
                    <span className="truncate text-[0.9375rem] text-zinc-900">{p.title}</span>
                    <span className="shrink-0 font-mono text-[0.75rem] text-zinc-500">
                      {p.studio} · <span className="tabular-nums">{p.year}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Quick actions" />
          <CardBody className="space-y-2">
            <ButtonLink full href="/admin/work/new" variant="primary">
              <Plus className="h-4 w-4" />
              Add work
            </ButtonLink>
            <ButtonLink full href="/admin/clients">
              <Building2 className="h-4 w-4" />
              Add a client
            </ButtonLink>
            <ButtonLink full href="/admin/homepage">
              <LayoutDashboard className="h-4 w-4" />
              Edit the homepage
            </ButtonLink>
            <ButtonLink full href="/admin/work">
              <Film className="h-4 w-4" />
              Manage work
            </ButtonLink>
            <ButtonLink full href="/admin/messages">
              <Mail className="h-4 w-4" />
              View messages
            </ButtonLink>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-[0.875rem] font-medium text-zinc-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <Eye className="h-4 w-4" />
              View the website
            </a>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/** "3 minutes ago" — relative up to a week, then a plain date. */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
