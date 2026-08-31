import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/admin/Sidebar";

// Middleware already blocks anonymous requests. This is the second check, and
// the one that matters: it requires a `profiles` row, so an auth user without
// one — which is what a stray signup would produce — is not an editor.
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  return (
    <div>
      <Sidebar email={user.email} role={user.role} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">{children}</div>
      </main>
    </div>
  );
}
