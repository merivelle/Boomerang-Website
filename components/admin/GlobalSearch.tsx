"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { SearchHit } from "@/app/api/admin/search/route";
import { Dialog, cn } from "./ui";

/**
 * Type "Wonka", press Enter, edit Wonka.
 *
 * Deliberately a palette rather than a search page: the point is to jump
 * somewhere in two seconds without losing your place, not to browse results.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Every keystroke fires a request; only the newest one is allowed to write
    // the results, or a slow early query overwrites a fast later one.
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (mine === seq.current) {
          setHits(json.hits ?? []);
          setActive(0);
        }
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 180);

    return () => clearTimeout(t);
  }, [q]);

  const groups = useMemo(() => {
    const by = new Map<string, SearchHit[]>();
    for (const h of hits) by.set(h.group, [...(by.get(h.group) ?? []), h]);
    return [...by.entries()];
  }, [hits]);

  function go(hit: SearchHit) {
    setOpen(false);
    router.push(hit.href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-2.5 text-[0.8125rem] text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1 font-sans text-[0.6875rem] text-zinc-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Search"
        description="Films, clients, photos, messages and screens."
        size="md"
      >
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && hits[active]) {
                e.preventDefault();
                go(hits[active]);
              }
            }}
            placeholder="Type a film, a client, a name…"
            aria-label="Search the editor"
            className="admin-input pl-9 pr-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
          )}
        </div>

        <div className="mt-4 min-h-[8rem]">
          {q.trim().length < 2 ? (
            <p className="admin-hint py-8 text-center">Type at least two letters.</p>
          ) : hits.length === 0 && !loading ? (
            <p className="admin-hint py-8 text-center">Nothing matches &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="space-y-4">
              {groups.map(([group, items]) => (
                <div key={group}>
                  <p className="admin-eyebrow mb-1.5 px-1">{group}</p>
                  <ul>
                    {items.map((h) => {
                      const index = hits.indexOf(h);
                      return (
                        <li key={`${h.group}-${h.href}-${h.label}`}>
                          <button
                            onMouseEnter={() => setActive(index)}
                            onClick={() => go(h)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                              index === active ? "bg-zinc-100" : "hover:bg-zinc-50",
                            )}
                          >
                            {h.image ? (
                              <span className="relative h-8 w-12 shrink-0 overflow-hidden rounded bg-zinc-100">
                                <Image src={h.image} alt="" fill sizes="48px" className="object-cover" />
                              </span>
                            ) : (
                              <span className="h-8 w-12 shrink-0" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.9375rem] text-zinc-900">
                                {h.label}
                              </span>
                              {h.detail && (
                                <span className="block truncate text-[0.8125rem] text-zinc-500">
                                  {h.detail}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
