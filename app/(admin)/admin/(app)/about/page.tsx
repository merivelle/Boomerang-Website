import { supabaseServer } from "@/lib/supabase/server";
import { AboutEditor, type AboutData } from "@/components/admin/AboutEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "About" };

export default async function AboutAdminPage() {
  const db = await supabaseServer();
  const [{ data: site }, { data: credits }] = await Promise.all([
    db.from("site_settings").select("founder,role,location,bio,credits_lead").eq("id", 1).single(),
    db.from("site_credits").select("title").order("sort_index"),
  ]);

  const s = site as {
    founder: string; role: string; location: string; bio: string; credits_lead: string;
  };

  const data: AboutData = {
    founder: s.founder,
    role: s.role,
    location: s.location,
    bio: s.bio,
    creditsLead: s.credits_lead,
    credits: ((credits ?? []) as Array<{ title: string }>).map((c) => c.title),
  };

  return <AboutEditor data={data} />;
}
