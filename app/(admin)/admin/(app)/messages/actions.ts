"use server";

import { currentUser, supabaseServer } from "@/lib/supabase/server";

/**
 * Status is the only thing an editor can change about a message. There is no
 * delete: RLS grants select and update on inquiries and nothing else, so a lead
 * cannot be destroyed by a misclick — 'archived' is how one goes away.
 */
export async function setInquiryStatus(
  id: string,
  status: "new" | "read" | "replied" | "archived" | "spam",
) {
  const user = await currentUser();
  if (!user) return;

  const db = await supabaseServer();
  await db
    .from("inquiries")
    .update({
      status,
      ...(status === "read" ? { read_at: new Date().toISOString(), read_by: user.id } : {}),
    } as never)
    .eq("id", id);
}
