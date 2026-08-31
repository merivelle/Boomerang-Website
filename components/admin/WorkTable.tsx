"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteWork, duplicateWork, setPublished } from "@/app/(admin)/admin/(app)/work/actions";

export type WorkRow = {
  slug: string;
  title: string;
  studio: string;
  year: number;
  category: string;
  poster: string | null;
  hasRealPoster: boolean;
  published: boolean;
  featured: boolean;
  inHero: boolean;
  tags: string[];
};

type Status = "live" | "needs-poster" | "hidden";

function statusOf(r: WorkRow): Status {
  if (!r.published) return "hidden";
  return r.hasRealPoster ? "live" : "needs-poster";
}

const STATUS_LABEL: Record<Status, string> = {
  live: "On the site",
  "needs-poster": "Needs a poster",
  hidden: "Hidden",
};

const STATUS_STYLE: Record<Status, string> = {
  live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "needs-poster": "bg-amber-50 text-amber-800 ring-amber-600/20",
  hidden: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

export function WorkTable({ rows, categories }: { rows: WorkRow[]; categories: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [status, setStatus] = useState<"All" | Status>("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "az">("newest");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (cat !== "All" && r.category !== cat) return false;
      if (status !== "All" && statusOf(r) !== status) return false;
      if (needle && !`${r.title} ${r.studio}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    out.sort((a, b) =>
      sort === "az"
        ? a.title.localeCompare(b.title)
        : sort === "oldest"
          ? a.year - b.year
          : b.year - a.year,
    );
    return out;
  }, [rows, q, cat, status, sort]);

  const needsPoster = rows.filter((r) => statusOf(r) === "needs-poster").length;

  return (
    <>
      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="q" className="admin-label mb-1.5 block">
            Search
          </label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Project or studio"
            className="admin-input"
          />
        </div>
        <div>
          <label htmlFor="cat" className="admin-label mb-1.5 block">
            Category
          </label>
          <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)} className="admin-input">
            {["All", ...categories].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="admin-label mb-1.5 block">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="admin-input"
          >
            <option value="All">All</option>
            <option value="live">On the site</option>
            <option value="needs-poster">Needs a poster</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="admin-label mb-1.5 block">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="admin-input"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Showing {shown.length} of {rows.length}
        {needsPoster > 0 && (
          <>
            {" · "}
            <button
              onClick={() => {
                setStatus("needs-poster");
                setCat("All");
                setQ("");
              }}
              className="underline underline-offset-2 hover:text-zinc-900"
            >
              {needsPoster} need a poster
            </button>
          </>
        )}
      </p>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[54rem] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="admin-label w-20 px-4 py-3 font-normal">Poster</th>
              <th className="admin-label px-4 py-3 font-normal">Project</th>
              <th className="admin-label px-4 py-3 font-normal">Client</th>
              <th className="admin-label w-20 px-4 py-3 font-normal">Year</th>
              <th className="admin-label px-4 py-3 font-normal">Category</th>
              <th className="admin-label px-4 py-3 font-normal">Status</th>
              <th className="admin-label px-4 py-3 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shown.map((r) => {
              const s = statusOf(r);
              return (
                <tr key={r.slug} className="align-middle hover:bg-zinc-50">
                  <td className="px-4 py-2.5">
                    <div className="relative h-9 w-16 overflow-hidden rounded bg-zinc-100">
                      {r.poster && (
                        <Image
                          src={r.poster}
                          alt=""
                          fill
                          sizes="64px"
                          className={`object-cover ${r.hasRealPoster ? "" : "opacity-50"}`}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/work/${r.slug}`}
                      className="text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {r.title}
                    </Link>
                    {(r.featured || r.inHero) && (
                      <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-zinc-400">
                        {r.inHero ? "Hero" : "Selected"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{r.studio}</td>
                  <td className="px-4 py-2.5 tabular-nums text-zinc-600">{r.year}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{r.category}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[s]}`}
                    >
                      {STATUS_LABEL[s]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap text-xs">
                      <Link href={`/admin/work/${r.slug}`} className="text-zinc-600 hover:text-zinc-900">
                        Edit
                      </Link>
                      <button
                        disabled={pending}
                        onClick={() => start(() => void setPublished(r.slug, !r.published))}
                        className="text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
                      >
                        {r.published ? "Hide" : "Publish"}
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => start(() => void duplicateWork(r.slug))}
                        className="text-zinc-600 hover:text-zinc-900 disabled:opacity-40"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => setConfirming(r.slug)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {shown.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">
            Nothing matches those filters.
          </p>
        )}
      </div>

      {/* Deleting is permanent, so it takes a deliberate second step. */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg text-zinc-900">Delete this credit?</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              <strong className="text-zinc-900">
                {rows.find((r) => r.slug === confirming)?.title}
              </strong>{" "}
              will be removed from the website. This can&rsquo;t be undone from
              here — your developer can recover it, but it&rsquo;s far easier to
              hide it instead.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const slug = confirming;
                  setConfirming(null);
                  start(() => void deleteWork(slug));
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
