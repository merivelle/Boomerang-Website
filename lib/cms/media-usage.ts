import "server-only";
import type { DB } from "./admin-helpers";

/**
 * Where each image is used.
 *
 * This exists so deleting is safe. `media.id` is referenced with ON DELETE SET
 * NULL, so removing a row that a credit points at does not fail — it quietly
 * blanks the credit's poster, and because the public site hides credits with no
 * still, the film simply disappears from the website with no error anywhere.
 * That is the single most destructive thing this admin could do by accident, so
 * usage is computed before the delete button is even enabled.
 *
 * Staged drafts count as usage too: an image attached to a credit that has not
 * been published yet is very much in use.
 */
export type Usage = { label: string; where: string; href: string | null; staged: boolean };

export async function mediaUsage(db: DB): Promise<Map<string, Usage[]>> {
  const [projects, clients, seo, settings, drafts] = await Promise.all([
    db
      .from("projects")
      .select("slug,title,still_media_id,placeholder_media_id,clip_media_id,og_media_id"),
    db.from("clients").select("id,name,logo_media_id"),
    db.from("seo_pages").select("path,og_media_id"),
    db.from("site_settings").select("og_media_id").eq("id", 1).maybeSingle(),
    db.from("drafts").select("table_name,row_key,label,patch"),
  ]);

  const map = new Map<string, Usage[]>();
  const add = (id: unknown, u: Usage) => {
    if (typeof id !== "string" || !id) return;
    map.set(id, [...(map.get(id) ?? []), u]);
  };

  for (const p of (projects.data ?? []) as Array<Record<string, unknown>>) {
    const href = `/admin/work/${p.slug}`;
    const title = String(p.title);
    add(p.still_media_id, { label: title, where: "Poster", href, staged: false });
    add(p.placeholder_media_id, { label: title, where: "Stand-in image", href, staged: false });
    add(p.clip_media_id, { label: title, where: "Hover clip", href, staged: false });
    add(p.og_media_id, { label: title, where: "Sharing image", href, staged: false });
  }

  for (const c of (clients.data ?? []) as Array<Record<string, unknown>>) {
    add(c.logo_media_id, {
      label: String(c.name),
      where: "Client logo",
      href: "/admin/clients",
      staged: false,
    });
  }

  for (const s of (seo.data ?? []) as Array<Record<string, unknown>>) {
    add(s.og_media_id, {
      label: String(s.path),
      where: "Sharing image",
      href: "/admin/seo",
      staged: false,
    });
  }

  add((settings.data as Record<string, unknown> | null)?.og_media_id, {
    label: "The whole site",
    where: "Default sharing image",
    href: "/admin/settings",
    staged: false,
  });

  for (const d of (drafts.data ?? []) as Array<Record<string, unknown>>) {
    const patch = (d.patch ?? {}) as Record<string, unknown>;
    for (const key of ["still_media_id", "logo_media_id", "og_media_id"]) {
      add(patch[key], {
        label: String(d.label),
        where: "Unpublished change",
        href: "/admin/publish",
        staged: true,
      });
    }
  }

  return map;
}
