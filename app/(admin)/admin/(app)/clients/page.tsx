import { supabaseServer } from "@/lib/supabase/server";
import { listDrafts } from "@/lib/cms/drafts";
import { ClientsEditor, type ClientRow, type GroupRow } from "@/components/admin/ClientsEditor";
import { mediaUrl, type MediaRef } from "../work/formData";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

type Row = {
  id: string; label: string; sort_index: number;
  clients: Array<{
    id: string; name: string; slug: string; website_url: string | null;
    sort_index: number; published: boolean;
    logo: MediaRef | null;
  }>;
};

export default async function ClientsAdminPage() {
  const db = await supabaseServer();

  const [{ data }, drafts] = await Promise.all([
    db
      .from("client_groups")
      .select(
        `id,label,sort_index,clients(id,name,slug,website_url,sort_index,published,
         logo:media!clients_logo_media_id_fkey(legacy_public_path,bucket,object_path))`,
      )
      .order("sort_index"),
    listDrafts(db),
  ]);

  const clientDrafts = drafts.filter((d) => d.table_name === "clients");
  const byId = new Map(clientDrafts.filter((d) => d.row_id).map((d) => [d.row_id!, d]));

  // A staged running order wins over the stored one, so dragging a logo and
  // coming back to the screen shows where you put it, not where it was.
  const order = new Map<string, number>();
  for (const d of clientDrafts) {
    if (!d.row_key?.startsWith("order:") || !Array.isArray(d.patch.order)) continue;
    (d.patch.order as string[]).forEach((id, i) => order.set(id, i));
  }

  // Every logo a draft points at, resolved in one query rather than one per row.
  const stagedLogoIds = clientDrafts
    .map((d) => d.patch.logo_media_id)
    .filter((v): v is string => typeof v === "string");

  const logos = new Map<string, string>();
  if (stagedLogoIds.length) {
    const { data: rows } = await db
      .from("media")
      .select("id,legacy_public_path,bucket,object_path")
      .in("id", stagedLogoIds);
    for (const m of (rows ?? []) as Array<MediaRef & { id: string }>) {
      const u = mediaUrl(m);
      if (u) logos.set(m.id, u);
    }
  }

  const groups: GroupRow[] = ((data ?? []) as unknown as Row[]).map((g) => {
    const clients: ClientRow[] = g.clients.map((c) => {
      const draft = byId.get(c.id);
      const patch = (draft?.patch ?? {}) as Record<string, unknown>;
      const stagedLogo = typeof patch.logo_media_id === "string" ? patch.logo_media_id : null;

      return {
        id: c.id,
        // Shown as it WILL read once published.
        name: (patch.name as string) ?? c.name,
        slug: c.slug,
        websiteUrl: ("website_url" in patch ? (patch.website_url as string | null) : c.website_url),
        logo: (stagedLogo && logos.get(stagedLogo)) ?? mediaUrl(c.logo),
        published: (patch.published as boolean) ?? c.published,
        draft: draft ? (draft.op === "delete" ? "removing" : "edited") : null,
      };
    });

    // Clients staged for a group they are not in yet still belong here.
    for (const d of clientDrafts) {
      if (d.op !== "insert" || d.patch.group_id !== g.id || !d.row_key) continue;
      const patch = d.patch as Record<string, unknown>;
      const stagedLogo = typeof patch.logo_media_id === "string" ? patch.logo_media_id : null;
      clients.push({
        id: d.id,
        name: (patch.name as string) ?? d.label,
        slug: String(patch.slug ?? ""),
        websiteUrl: (patch.website_url as string | null) ?? null,
        logo: (stagedLogo && logos.get(stagedLogo)) ?? null,
        published: (patch.published as boolean) ?? true,
        draft: "new",
      });
    }

    return {
      id: g.id,
      label: g.label,
      // PostgREST does not order embedded rows, so the wall would shuffle.
      clients: clients.sort((a, b) => {
        const ra = order.get(a.id);
        const rb = order.get(b.id);
        if (ra !== undefined || rb !== undefined)
          return (ra ?? Number.MAX_SAFE_INTEGER) - (rb ?? Number.MAX_SAFE_INTEGER);
        const sa = g.clients.find((c) => c.id === a.id)?.sort_index ?? Number.MAX_SAFE_INTEGER;
        const sb = g.clients.find((c) => c.id === b.id)?.sort_index ?? Number.MAX_SAFE_INTEGER;
        return sa - sb;
      }),
    };
  });

  return <ClientsEditor groups={groups} />;
}
