"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSeo } from "@/app/(admin)/admin/(app)/site-actions";

export type SeoRow = { path: string; label: string; title: string; description: string };

const HOST = "boomerang-music.com";

// Google truncates around these widths. Counting characters is a rough proxy,
// but it is the one an editor can act on.
const TITLE_MAX = 60;
const DESC_MAX = 155;

function Meter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span className={`font-mono text-[0.65rem] tabular-nums ${over ? "text-amber-700" : "text-zinc-400"}`}>
      {value}/{max}
      {over && " · may be cut short"}
    </span>
  );
}

function PageBlock({ row, siteName }: { row: SeoRow; siteName: string }) {
  const [title, setTitle] = useState(row.title);
  const [desc, setDesc] = useState(row.description);

  // The site's own title template, so the preview matches what ships.
  const fullTitle = row.path === "/" ? title : `${title} — ${siteName}`;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <input type="hidden" name="path" value={row.path} />

      <div className="flex items-baseline justify-between gap-3">
        <p className="admin-label">{row.label}</p>
        <span className="font-mono text-xs text-zinc-400">{row.path}</span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="admin-label">Title</label>
              <Meter value={fullTitle.length} max={TITLE_MAX} />
            </div>
            <input
              name={`title:${row.path}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="admin-input"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="admin-label">Description</label>
              <Meter value={desc.length} max={DESC_MAX} />
            </div>
            <textarea
              name={`description:${row.path}`}
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="admin-input resize-y"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Google result */}
          <div>
            <p className="admin-label mb-2">In Google</p>
            <div className="rounded-md border border-zinc-200 p-4">
              <p className="text-xs text-zinc-600">
                {HOST}
                {row.path === "/" ? "" : ` › ${row.path.slice(1)}`}
              </p>
              <p className="mt-0.5 truncate text-[1.05rem] leading-snug text-[#1a0dab]">
                {fullTitle || "Untitled"}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.82rem] leading-snug text-zinc-600">
                {desc || "No description yet."}
              </p>
            </div>
          </div>

          {/* Shared link */}
          <div>
            <p className="admin-label mb-2">Shared as a link</p>
            <div className="overflow-hidden rounded-md border border-zinc-200">
              <div className="flex h-24 items-center justify-center bg-zinc-900">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500">
                  {siteName}
                </span>
              </div>
              <div className="p-3">
                <p className="text-[0.7rem] uppercase text-zinc-400">{HOST}</p>
                <p className="truncate text-sm text-zinc-900">{fullTitle || "Untitled"}</p>
                <p className="line-clamp-2 text-xs text-zinc-600">{desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SeoEditor({ rows, siteName }: { rows: SeoRow[]; siteName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await saveSeo(form);
      if (!res.ok) return setError(res.error);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">SEO</h1>
          <p className="mt-1 text-sm text-zinc-500">
            How each page reads in Google and when its link is shared.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-700">Saved</span>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {rows.map((r) => (
          <PageBlock key={r.path} row={r} siteName={siteName} />
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-zinc-500">
        Everything technical — how Google finds and indexes the site, the sitemap,
        the share image — is handled by the website itself. There is nothing here
        that can accidentally hide the site from search.
      </p>
    </form>
  );
}
