import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type AdminBadges = { unread: number; drafts: number };

// The shape of a head-count query, narrowed just enough to chain filters on it.
type Q = ReturnType<ReturnType<Awaited<ReturnType<typeof supabaseServer>>["from"]>["select"]>;

/**
 * The two numbers the shell shows on every screen: unanswered messages, and
 * staged changes waiting to be published.
 *
 * Both are wrapped so a failure is a zero, never a crashed layout. `drafts` in
 * particular has to survive the window between deploying this code and running
 * 0006_cms.sql by hand in the SQL editor — before that migration the table does
 * not exist, and an admin that will not load is a far worse outcome than a
 * badge that reads zero for an afternoon.
 */
export async function adminBadges(): Promise<AdminBadges> {
  const db = await supabaseServer();

  // The builder is PromiseLike, not a Promise, so it has no .catch of its own.
  const count = async (table: string, apply?: (q: Q) => Q) => {
    try {
      const base = db.from(table).select("id", { count: "exact", head: true });
      const { count: n } = await (apply ? apply(base as Q) : (base as Q));
      return n ?? 0;
    } catch {
      return 0;
    }
  };

  const [unread, drafts] = await Promise.all([
    count("inquiries", (q) => q.eq("status", "new")),
    count("drafts"),
  ]);

  return { unread, drafts };
}
