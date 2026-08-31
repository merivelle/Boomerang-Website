import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Labs" };

// Developer sandboxes for the WebGL intro. They used to sit at /loader-lab and
// /logo-reveal-lab, publicly reachable and prerendered — harmless until a
// sitemap existed, at which point Google would have indexed them.
export default async function LabsPage() {
  const user = await currentUser();
  if (user?.role !== "developer") redirect("/admin");

  return (
    <>
      <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Labs</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Sandboxes for the intro animation. Developer only.
      </p>
      <ul className="mt-6 space-y-2">
        {[
          ["/admin/labs/loader", "Metal tornado", "The WebGL loader, with a ?t= scrub parameter."],
          ["/admin/labs/logo-reveal", "Logo reveal", "The GSAP draw-on of the B mark."],
        ].map(([href, title, note]) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-400"
            >
              <p className="text-sm text-zinc-900">{title}</p>
              <p className="text-xs text-zinc-500">{note}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
