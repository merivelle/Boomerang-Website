import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Turns on preview and sends the editor to the page they wanted to look at.
 *
 * The session check is the real gate. Next's draft-mode cookie is only half of
 * it — lib/cms/preview.ts also requires a valid editor session on every request
 * before it will overlay anything, so a cookie on its own shows a stranger
 * exactly what the site shows today.
 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");

  const asked = new URL(request.url).searchParams.get("to") ?? "/";

  // Only a same-origin path. Without this the admin would happily bounce
  // someone to any URL a crafted link named.
  const to = /^\/(?!\/)/.test(asked) ? asked : "/";

  (await draftMode()).enable();
  redirect(to);
}
