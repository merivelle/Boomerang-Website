import { previewing } from "@/lib/cms/preview";

/**
 * Rendered by the public layout, but only ever visible to a signed-in editor
 * who has explicitly turned preview on — for everyone else `previewing()` is
 * false and this returns null, so the public page is byte-for-byte unchanged.
 *
 * It exists because a preview with no way out is a trap: the editor would
 * wander the site seeing unpublished copy and have no idea why.
 */
export async function PreviewBanner() {
  if (!(await previewing())) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-center gap-x-4 gap-y-1
                 bg-violet-600 px-4 py-2.5 text-center font-sans text-[0.8125rem] text-white"
      style={{ letterSpacing: 0, lineHeight: 1.4 }}
    >
      <span>
        You&rsquo;re previewing unpublished changes. Visitors still see the published site.
      </span>
      <span className="flex items-center gap-3">
        <a href="/admin/publish" className="font-semibold underline underline-offset-2">
          Review &amp; publish
        </a>
        <a
          href="/api/admin/preview/disable?to=/admin/publish"
          className="rounded-md bg-white/15 px-2.5 py-1 font-medium transition-colors hover:bg-white/25"
        >
          Exit preview
        </a>
      </span>
    </div>
  );
}
