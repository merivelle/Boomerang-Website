import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { ClientsEditor, type GroupRow } from "@/components/admin/ClientsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

type Row = {
  id: string; label: string; sort_index: number;
  clients: Array<{
    id: string; name: string; slug: string; website_url: string | null;
    sort_index: number; published: boolean;
    logo: { legacy_public_path: string | null; bucket: string | null; object_path: string | null } | null;
  }>;
};

export default async function ClientsAdminPage() {
  const db = await supabaseServer();
  const user = await currentUser();

  const { data } = await db
    .from("client_groups")
    .select(
      `id,label,sort_index,clients(id,name,slug,website_url,sort_index,published,
       logo:media!clients_logo_media_id_fkey(legacy_public_path,bucket,object_path))`,
    )
    .order("sort_index");

  const groups: GroupRow[] = ((data ?? []) as unknown as Row[]).map((g) => ({
    id: g.id,
    label: g.label,
    // PostgREST does not order embedded rows, so the wall would shuffle.
    clients: [...g.clients]
      .sort((a, b) => a.sort_index - b.sort_index)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        websiteUrl: c.website_url,
        published: c.published,
        logo: !c.logo
          ? null
          : c.logo.legacy_public_path ??
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${c.logo.bucket}/${c.logo.object_path}`,
      })),
  }));

  return <ClientsEditor groups={groups} isDeveloper={user?.role === "developer"} />;
}
