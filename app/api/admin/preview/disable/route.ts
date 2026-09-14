import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

/** Leaves preview. Deliberately requires no session — getting out always works. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("to") ?? "/admin/publish";
  const to = /^\/(?!\/)/.test(asked) ? asked : "/admin/publish";

  (await draftMode()).disable();
  redirect(to);
}
