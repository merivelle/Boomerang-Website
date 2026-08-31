import { supabaseServer } from "@/lib/supabase/server";
import { SettingsEditor, type SettingsData } from "@/components/admin/SettingsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await supabaseServer();
  const [{ data: site }, { data: priv }] = await Promise.all([
    db.from("site_settings")
      .select("name,phone,instagram_handle,copyright_year,intro").eq("id", 1).single(),
    // Readable here because the editor is authenticated; the public site has no
    // policy on this table at all.
    db.from("site_private").select("contact_email").eq("id", 1).single(),
  ]);

  const s = site as {
    name: string; phone: string | null; instagram_handle: string | null;
    copyright_year: number | null; intro: string;
  };

  const data: SettingsData = {
    siteName: s.name,
    phone: s.phone ?? "",
    instagramHandle: s.instagram_handle ?? "",
    copyrightYear: s.copyright_year ?? new Date().getFullYear(),
    intro: s.intro,
    contactEmail: (priv as { contact_email: string } | null)?.contact_email ?? "",
  };

  return <SettingsEditor data={data} />;
}
