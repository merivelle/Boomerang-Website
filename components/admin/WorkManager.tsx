"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Eye,
  EyeOff,
  Film,
  ImageOff,
  LayoutGrid,
  Plus,
  Rows3,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { deleteWork, duplicateWork, setPublished } from "@/app/(admin)/admin/(app)/work/actions";
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  IconButton,
  PageTitle,
  cn,
  useToast,
} from "./ui";

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
  hasTrailer: boolean;
  hasDescription: boolean;
  addedAt: string;
  /** Set when this credit has unpublished edits waiting. */
  draft: "new" | "edited" | "removing" | null;
};

// Filters live in the URL so the dashboard can link straight to one — "42 need
// a poster" opens the list already narrowed — and so a filtered view can be
// bookmarked or sent to someone.
const STATUSES = [
  { id: "all", label: "All" },
  { id: "live", label: "On the website" },
  { id: "hidden", label: "Hidden" },
  { id: "missing-poster", label: "Needs a poster" },
  { id: "missing-info", label: "No trailer link" },
  { id: "featured", label: "In Selected Work" },
  { id: "homepage", label: "In the homepage hero" },
  { id: "unpublished", label: "Has unpublished edits" },
] as const;

type Status = (typeof STATUSES)[number]["id"];

const SORTS = [
  { id: "newest", label: "Newest film first" },
  { id: "oldest", label: "Oldest film first" },
  { id: "title", label: "Title A–Z" },
  { id: "client", label: "Client A–Z" },
  { id: "added", label: "Recently added" },
] as const;

type Sort = (typeof SORTS)[number]["id"];

function matches(r: WorkRow, status: Status): boolean {
  switch (status) {
    case "live":
      return r.published && r.hasRealPoster;
    case "hidden":
      return !r.published;
    case "missing-poster":
      return !r.hasRealPoster;
    case "missing-info":
      // Deliberately NOT "has no search description": the site writes one from
      // the film's own details when that is blank, so flagging it would mean
      // flagging every credit for a problem that does not exist.
      return !r.hasTrailer;
    case "featured":
      return r.featured;
    case "homepage":
      return r.inHero;
    case "unpublished":
      return r.draft !== null;
    default:
      return true;
  }
}

export function WorkManager({ rows, categories }: { rows: WorkRow[]; categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();

  const q = params.get("q") ?? "";
  const cat = params.get("category") ?? "All";
  const status = (params.get("status") ?? "all") as Status;
  const sort = (params.get("sort") ?? "newest") as Sort;
  const view = params.get("view") === "list" ? "list" : "grid";

  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "All" || value === "all" || value === "") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (cat !== "All" && r.category !== cat) return false;
      if (!matches(r, status)) return false;
      if (needle && !`${r.title} ${r.studio}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    out.sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "client":
          return a.studio.localeCompare(b.studio) || b.year - a.year;
        case "oldest":
          return a.year - b.year;
        case "added":
          return b.addedAt.localeCompare(a.addedAt);
        default:
          return b.year - a.year;
      }
    });
    return out;
  }, [rows, q, cat, status, sort]);

  const counts = useMemo(
    () => ({
      missingPoster: rows.filter((r) => !r.hasRealPoster).length,
      missingInfo: rows.filter((r) => !r.hasTrailer).length,
    }),
    [rows],
  );

  const filtered = cat !== "All" || status !== "all" || q !== "";

  return (
    <>
      <PageTitle
        title="Work"
        description="Every credit on the website. Edits are saved as you go and go live when you publish."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/work/filters">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </ButtonLink>
            <ButtonLink href="/admin/work/new" variant="primary">
              <Plus className="h-4 w-4" />
              Add work
            </ButtonLink>
          </div>
        }
      />

      {/* ------------------------------------------------------------ filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search by film or client"
            aria-label="Search work"
            className="admin-input pl-9"
          />
          {q && (
            <button
              onClick={() => setParam("q", null)}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={cat}
          onChange={(e) => setParam("category", e.target.value)}
          aria-label="Filter by category"
          className="admin-input w-auto min-w-[9rem]"
        >
          {["All", ...categories].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          aria-label="Filter by status"
          className="admin-input w-auto min-w-[11rem]"
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          aria-label="Sort"
          className="admin-input w-auto min-w-[11rem]"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-zinc-300 bg-white p-0.5">
          {(
            [
              { id: "grid", icon: LayoutGrid, label: "Grid view" },
              { id: "list", icon: Rows3, label: "List view" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setParam("view", v.id === "grid" ? null : v.id)}
              aria-label={v.label}
              aria-pressed={view === v.id}
              title={v.label}
              className={cn(
                "inline-flex h-8 w-9 items-center justify-center rounded-md transition-colors",
                view === v.id ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              <v.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-zinc-500">
        <span>
          Showing <span className="tabular-nums text-zinc-700">{shown.length}</span> of{" "}
          <span className="tabular-nums text-zinc-700">{rows.length}</span>
        </span>
        {counts.missingPoster > 0 && status !== "missing-poster" && (
          <button
            onClick={() => setParam("status", "missing-poster")}
            className="text-amber-700 underline underline-offset-2 hover:text-amber-800"
          >
            {counts.missingPoster} need a poster
          </button>
        )}
        {counts.missingInfo > 0 && status !== "missing-info" && (
          <button
            onClick={() => setParam("status", "missing-info")}
            className="underline underline-offset-2 hover:text-zinc-900"
          >
            {counts.missingInfo} with no trailer link
          </button>
        )}
        {filtered && (
          <button
            onClick={() => router.replace(pathname, { scroll: false })}
            className="underline underline-offset-2 hover:text-zinc-900"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* --------------------------------------------------------------- rows */}
      {shown.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Film}
            title={filtered ? "Nothing matches those filters" : "No credits yet"}
            description={
              filtered
                ? "Try a different search, or clear the filters to see everything."
                : "Add the first credit and it will appear here."
            }
            action={
              filtered ? (
                <Button onClick={() => router.replace(pathname, { scroll: false })}>
                  Clear filters
                </Button>
              ) : (
                <ButtonLink href="/admin/work/new" variant="primary">
                  <Plus className="h-4 w-4" />
                  Add work
                </ButtonLink>
              )
            }
          />
        </div>
      ) : view === "grid" ? (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <GridCard
              key={r.slug}
              r={r}
              pending={pending}
              onToggle={() => togglePublished(r)}
              onDuplicate={() => duplicate(r)}
              onDelete={() => setConfirming(r.slug)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[54rem] text-left">
            <thead>
              <tr className="border-b border-zinc-200">
                {["Poster", "Project", "Client", "Year", "Category", "Status", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className="admin-eyebrow px-4 py-3 font-normal"
                    scope="col"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((r) => (
                <tr key={r.slug} className="align-middle transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-2.5">
                    <Thumb r={r} className="h-9 w-16" sizes="64px" />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/work/${r.slug}`}
                      className="text-[0.9375rem] text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <Placement r={r} />
                  </td>
                  <td className="px-4 py-2.5 text-[0.875rem] text-zinc-600">{r.studio}</td>
                  <td className="px-4 py-2.5 text-[0.875rem] tabular-nums text-zinc-600">{r.year}</td>
                  <td className="px-4 py-2.5 text-[0.875rem] text-zinc-600">{r.category}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge r={r} />
                  </td>
                  <td className="px-4 py-2.5">
                    <RowActions
                      r={r}
                      pending={pending}
                      onToggle={() => togglePublished(r)}
                      onDuplicate={() => duplicate(r)}
                      onDelete={() => setConfirming(r.slug)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        busy={pending}
        title="Remove this credit?"
        confirmLabel="Remove it"
        body={
          <>
            <strong className="text-zinc-900">
              {rows.find((r) => r.slug === confirming)?.title}
            </strong>{" "}
            will be queued for removal. It stays on the website until you publish, and you can
            still change your mind on the Review &amp; publish screen. If you only want it out of
            sight for now, hide it instead — that keeps everything.
          </>
        }
        onConfirm={() => {
          const slug = confirming;
          setConfirming(null);
          if (!slug) return;
          start(async () => {
            await deleteWork(slug);
            toast.info("Queued for removal. Publish to take it off the website.");
          });
        }}
      />
    </>
  );

  function togglePublished(r: WorkRow) {
    start(async () => {
      await setPublished(r.slug, !r.published);
      toast.info(
        r.published
          ? `${r.title} will be hidden once you publish.`
          : `${r.title} will go on the website once you publish.`,
      );
      router.refresh();
    });
  }

  function duplicate(r: WorkRow) {
    start(async () => {
      await duplicateWork(r.slug);
      toast.success(`Copied ${r.title}. The copy is waiting in your unpublished changes.`);
      router.refresh();
    });
  }
}

// ---------------------------------------------------------------- fragments --

function Thumb({ r, className, sizes }: { r: WorkRow; className: string; sizes: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded bg-zinc-100", className)}>
      {r.poster ? (
        <Image
          src={r.poster}
          alt=""
          fill
          sizes={sizes}
          className={cn("object-cover", r.hasRealPoster ? "" : "opacity-40")}
        />
      ) : (
        <span className="flex h-full items-center justify-center">
          <ImageOff className="h-4 w-4 text-zinc-300" />
        </span>
      )}
    </div>
  );
}

function StatusBadge({ r }: { r: WorkRow }) {
  if (r.draft === "removing") return <Badge tone="danger">Removing</Badge>;
  if (r.draft === "new") return <Badge tone="draft">Not published yet</Badge>;
  if (!r.published) return <Badge tone="neutral">Hidden</Badge>;
  if (!r.hasRealPoster) return <Badge tone="warning">Needs a poster</Badge>;
  return <Badge tone="live">On the website</Badge>;
}

function Placement({ r }: { r: WorkRow }) {
  if (!r.inHero && !r.featured && r.draft !== "edited") return null;
  return (
    <span className="ml-2 inline-flex gap-1.5 align-middle">
      {r.inHero && <span className="admin-eyebrow">Hero</span>}
      {r.featured && !r.inHero && <span className="admin-eyebrow">Selected</span>}
      {r.draft === "edited" && (
        <span className="text-[0.6875rem] font-medium text-violet-600">Edited</span>
      )}
    </span>
  );
}

function RowActions({
  r,
  pending,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  r: WorkRow;
  pending: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <IconButton
        size="sm"
        label={r.published ? "Hide from the website" : "Put on the website"}
        disabled={pending}
        onClick={onToggle}
      >
        {r.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </IconButton>
      <IconButton size="sm" label="Make a copy" disabled={pending} onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="sm"
        label="Remove"
        onClick={onDelete}
        className="hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function GridCard({
  r,
  pending,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  r: WorkRow;
  pending: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group admin-card overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/admin/work/${r.slug}`} className="block">
        <div className="relative aspect-video w-full bg-zinc-100">
          {r.poster ? (
            <Image
              src={r.poster}
              alt=""
              fill
              sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
              className={cn("object-cover", r.hasRealPoster ? "" : "opacity-40")}
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1.5 text-zinc-300">
              <ImageOff className="h-6 w-6" />
              <span className="text-[0.75rem] text-zinc-400">No poster</span>
            </span>
          )}
          <span className="absolute left-2 top-2">
            <StatusBadge r={r} />
          </span>
        </div>
      </Link>

      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <Link
            href={`/admin/work/${r.slug}`}
            className="block truncate text-[0.9375rem] font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            {r.title}
          </Link>
          <p className="truncate text-[0.8125rem] text-zinc-500">
            {r.studio} · <span className="tabular-nums">{r.year}</span> · {r.category}
          </p>
          <Placement r={r} />
        </div>

        <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <RowActions
            r={r}
            pending={pending}
            onToggle={onToggle}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </div>
    </li>
  );
}
