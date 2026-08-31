"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFeatured, saveHero } from "@/app/(admin)/admin/(app)/homepage/actions";

export type Pick = { slug: string; title: string; studio: string; year: number; poster: string | null };

function Thumb({ p }: { p: Pick | undefined }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded bg-zinc-100">
      {p?.poster && <Image src={p.poster} alt="" fill sizes="220px" className="object-cover" />}
    </div>
  );
}

/**
 * The hero is a fixed six slots, not a free-form list. Six is structural: the
 * column layout is tuned for it, and the mobile wordmark is two triptychs of
 * three — so slots 1–3 and 4–6 are the two states it dissolves between, which
 * is why the grouping is drawn.
 */
function HeroPicker({ initial, options }: { initial: Pick[]; options: Pick[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<string[]>(() => {
    const s = initial.map((p) => p.slug);
    while (s.length < 6) s.push("");
    return s.slice(0, 6);
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const byslug = new Map(options.map((o) => [o.slug, o]));
  const dupes = slots.filter((s, i) => s && slots.indexOf(s) !== i);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveHero(slots.filter(Boolean));
      setMsg(res.ok ? { ok: true, text: "Homepage hero updated." } : { ok: false, text: res.error! });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg text-zinc-900">Hero</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            The six films across the top of the homepage, left to right.
          </p>
        </div>
        <button
          onClick={save}
          disabled={pending || dupes.length > 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save hero"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {slots.map((slug, i) => (
          <div key={i}>
            {i % 3 === 0 && (
              <p className="admin-label mb-2">
                {i === 0 ? "First three" : "Second three"}
                <span className="ml-2 normal-case tracking-normal text-zinc-400">
                  {i === 0 ? "shown at rest" : "dissolves to this"}
                </span>
              </p>
            )}
            <Thumb p={byslug.get(slug)} />
            <select
              value={slug}
              onChange={(e) => {
                const next = [...slots];
                next[i] = e.target.value;
                setSlots(next);
                setMsg(null);
              }}
              className="admin-input mt-2 text-sm"
            >
              <option value="">Choose a film…</option>
              {options.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.title} · {o.year}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {dupes.length > 0 && (
        <p className="mt-3 text-sm text-amber-700">
          The same film is in more than one slot — each has to be different.
        </p>
      )}
      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Only films with a poster can go here. On phones these same six become the
        image inside the BOOMERANG lettering.
      </p>
    </section>
  );
}

/** Selected Work is an ordered list — position is the row number on the page. */
function FeaturedPicker({ initial, options }: { initial: Pick[]; options: Pick[] }) {
  const router = useRouter();
  const [list, setList] = useState<string[]>(initial.map((p) => p.slug));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const byslug = new Map(options.map((o) => [o.slug, o]));
  const available = options.filter((o) => !list.includes(o.slug));

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    setMsg(null);
  };

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveFeatured(list);
      setMsg(res.ok ? { ok: true, text: "Selected Work updated." } : { ok: false, text: res.error! });
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg text-zinc-900">Selected Work</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            The numbered list further down the homepage, in this order.
          </p>
        </div>
        <button
          onClick={save}
          disabled={pending || list.length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save list"}
        </button>
      </div>

      <ul className="mt-5 space-y-2">
        {list.map((slug, i) => {
          const p = byslug.get(slug);
          return (
            <li
              key={slug}
              className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-zinc-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="w-28 shrink-0">
                <Thumb p={p} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-900">{p?.title ?? slug}</p>
                <p className="font-mono text-xs text-zinc-500">
                  {p?.studio} · <span className="tabular-nums">{p?.year}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === list.length - 1}
                  aria-label="Move down"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    setList(list.filter((s) => s !== slug));
                    setMsg(null);
                  }}
                  className="ml-2 rounded px-2 py-1 text-xs text-zinc-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {list.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
          Nothing selected. Add a film below.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="add-featured" className="admin-label">
          Add a film
        </label>
        <select
          id="add-featured"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              setList([...list, e.target.value]);
              setMsg(null);
            }
          }}
          className="admin-input max-w-sm text-sm"
        >
          <option value="">Choose…</option>
          {available.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.title} · {o.year}
            </option>
          ))}
        </select>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Films here play a short silent clip on hover if one has been prepared.
        Without one they show the poster instead, which is how the design
        expects it to look — nothing is missing.
      </p>
    </section>
  );
}

export function HomepageCurator({
  hero,
  featured,
  options,
}: {
  hero: Pick[];
  featured: Pick[];
  options: Pick[];
}) {
  return (
    <>
      <HeroPicker initial={hero} options={options} />
      <FeaturedPicker initial={featured} options={options} />
    </>
  );
}
