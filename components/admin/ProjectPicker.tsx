"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImageOff, Search } from "lucide-react";
import { Dialog, EmptyState, cn } from "./ui";

export type Pick = {
  slug: string;
  title: string;
  studio: string;
  year: number;
  poster: string | null;
};

/**
 * Choosing a film by looking at it.
 *
 * The homepage used to be six <select> dropdowns, which asked an editor to
 * curate a visual layout by reading a list of titles. Everything on this screen
 * is a picture for the same reason the page it edits is.
 */
export function ProjectPicker({
  open,
  onClose,
  onPick,
  options,
  title = "Choose a film",
  description,
  /** Already used elsewhere in this list — shown, but marked and not pickable. */
  taken = [],
  current,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (slug: string) => void;
  options: Pick[];
  title?: string;
  description?: string;
  taken?: string[];
  current?: string | null;
}) {
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => `${o.title} ${o.studio} ${o.year}`.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="xl">
      <div className="relative mb-4">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by film, client or year"
          aria-label="Search films"
          className="admin-input pl-9"
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No films match"
          description="Only films that are on the website and have a poster can appear here."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((o) => {
            const used = taken.includes(o.slug) && o.slug !== current;
            const isCurrent = o.slug === current;
            return (
              <li key={o.slug}>
                <button
                  type="button"
                  disabled={used}
                  onClick={() => {
                    onPick(o.slug);
                    onClose();
                  }}
                  className={cn(
                    "group w-full overflow-hidden rounded-lg border text-left transition-all",
                    used
                      ? "cursor-not-allowed border-zinc-200 opacity-40"
                      : "border-zinc-200 hover:border-zinc-900 hover:shadow-md",
                    isCurrent && "border-zinc-900 ring-2 ring-zinc-900/15",
                  )}
                >
                  <div className="relative aspect-video w-full bg-zinc-100">
                    {o.poster ? (
                      <Image
                        src={o.poster}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 12rem, 40vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <ImageOff className="h-4 w-4 text-zinc-300" />
                      </span>
                    )}
                    {used && (
                      <span className="absolute inset-x-0 bottom-0 bg-zinc-900/80 py-1 text-center text-[0.6875rem] font-medium text-white">
                        Already used
                      </span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-[0.8125rem] font-medium text-zinc-900">{o.title}</p>
                    <p className="truncate text-[0.75rem] text-zinc-500">
                      {o.studio} · <span className="tabular-nums">{o.year}</span>
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
