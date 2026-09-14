import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { adminBadges } from "@/lib/cms/admin-badges";
import { Sidebar } from "@/components/admin/Sidebar";
import { TopBar } from "@/components/admin/TopBar";
import { ToastProvider } from "@/components/admin/ui";

// Middleware already blocks anonymous requests. This is the second check, and
// the one that matters: it requires a `profiles` row, so an auth user without
// one — which is what a stray signup would produce — is not an editor.
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const badges = await adminBadges();

  return (
    <ToastProvider>
      <Sidebar email={user.email} role={user.role} unread={badges.unread} />
      <main className="lg:pl-[15rem]">
        <TopBar drafts={badges.drafts} />
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">{children}</div>
      </main>
    </ToastProvider>
  );
}
