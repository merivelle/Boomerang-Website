import { supabaseServer } from "@/lib/supabase/server";
import { getDraft } from "@/lib/cms/drafts";
import { SettingsEditor, type SettingsData } from "@/components/admin/SettingsEditor";
import { ogLibrary, resolveOg } from "../og-images";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await supabaseServer();

  const [{ data: site }, { data: priv }, draft, ogOptions] = await Promise.all([
    db
      .from("site_settings")
      .select("name,phone,instagram_handle,copyright_year,intro,og_media_id")
      .eq("id", 1)
      .single(),
    // Readable here because the editor is authenticated; the public site has no
    // policy on this table at all.
    db.from("site_private").select("contact_email").eq("id", 1).single(),
    getDraft("site_settings", { rowKey: "site" }),
    ogLibrary(db),
  ]);

  const s = (site ?? {}) as Record<string, unknown>;
  const patch = (draft?.patch ?? {}) as Record<string, unknown>;
  const pick = <T,>(key: string, live: T): T => (key in patch ? (patch[key] as T) : live);

  const data: SettingsData = {
    siteName: String(s.name ?? ""),
    phone: pick<string | null>("phone", (s.phone as string | null) ?? null) ?? "",
    instagramHandle:
      pick<string | null>("instagram_handle", (s.instagram_handle as string | null) ?? null) ?? "",
    copyrightYear: Number(pick("copyright_year", s.copyright_year ?? new Date().getFullYear())),
    intro: String(pick("intro", s.intro ?? "")),
    contactEmail:
      pick<string>("contact_email", (priv as { contact_email: string } | null)?.contact_email ?? ""),
    ogImage: await resolveOg(db, pick<string | null>("og_media_id", (s.og_media_id as string) ?? null)),
  };

  return <SettingsEditor data={data} ogOptions={ogOptions} />;
}
