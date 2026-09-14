import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { mediaUrl } from "@/app/(admin)/admin/(app)/work/formData";

export const runtime = "nodejs";

export type SearchHit = {
  group: "Work" | "Clients" | "Photos" | "Messages" | "Pages";
  label: string;
  detail: string | null;
  href: string;
  image: string | null;
};

// The screens themselves are searchable too. Someone who wants the homepage
// editor is far more likely to type "homepage" than to scan the sidebar.
const PAGES: Array<{ label: string; detail: string; href: string; words: string }> = [
  { label: "Dashboard", detail: "Overview", href: "/admin", words: "dashboard home overview" },
  { label: "Work", detail: "All credits", href: "/admin/work", words: "work credits films projects" },
  { label: "Work filters", detail: "Categories and tags on the Work page", href: "/admin/work/filters", words: "filters categories tags chips buttons work" },
  { label: "Homepage", detail: "Hero and Selected Work", href: "/admin/homepage", words: "homepage hero selected work front" },
  { label: "Clients", detail: "The client wall", href: "/admin/clients", words: "clients logos studios wall" },
  { label: "About", detail: "Company copy", href: "/admin/about", words: "about bio biography founder credits" },
  { label: "Photos", detail: "Media library", href: "/admin/media", words: "photos images media library pictures posters" },
  { label: "Search & sharing", detail: "How pages read in Google", href: "/admin/seo", words: "seo search google sharing social meta" },
  { label: "Settings", detail: "Contact details and site-wide values", href: "/admin/settings", words: "settings contact email phone instagram copyright" },
  { label: "Messages", detail: "Contact form enquiries", href: "/admin/messages", words: "messages inbox enquiries contact" },
  { label: "Review & publish", detail: "Unpublished changes", href: "/admin/publish", words: "publish review changes draft live" },
];

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const db = await supabaseServer();
  const like = `%${q}%`;

  const [projects, clients, media, inquiries] = await Promise.all([
    db
      .from("projects")
      .select(
        "slug,title,studio,year,still:media!projects_still_media_id_fkey(legacy_public_path,bucket,object_path)",
      )
      .or(`title.ilike.${like},studio.ilike.${like},slug.ilike.${like}`)
      .limit(6),
    db.from("clients").select("id,name").ilike("name", like).limit(4),
    db
      .from("media")
      .select("id,alt,kind,legacy_public_path,bucket,object_path")
      .ilike("alt", like)
      .limit(4),
    db
      .from("inquiries")
      .select("id,name,email,subject")
      .or(`name.ilike.${like},email.ilike.${like},subject.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const needle = q.toLowerCase();
  const hits: SearchHit[] = [
    ...PAGES.filter((p) => p.words.includes(needle) || p.label.toLowerCase().includes(needle))
      .slice(0, 3)
      .map((p) => ({
        group: "Pages" as const,
        label: p.label,
        detail: p.detail,
        href: p.href,
        image: null,
      })),

    ...((projects.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      group: "Work" as const,
      label: String(p.title),
      detail: `${p.studio} · ${p.year}`,
      href: `/admin/work/${p.slug}`,
      image: p.still ? mediaUrl(p.still as never) : null,
    })),

    ...((clients.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
      group: "Clients" as const,
      label: String(c.name),
      detail: null,
      href: "/admin/clients",
      image: null,
    })),

    ...((media.data ?? []) as Array<Record<string, unknown>>).map((m) => ({
      group: "Photos" as const,
      label: String(m.alt),
      detail: String(m.kind),
      href: "/admin/media",
      image: mediaUrl(m as never),
    })),

    ...((inquiries.data ?? []) as Array<Record<string, unknown>>).map((i) => ({
      group: "Messages" as const,
      label: String(i.name),
      detail: (i.subject as string) ?? String(i.email),
      href: "/admin/messages",
      image: null,
    })),
  ];

  return NextResponse.json({ hits });
}
