"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/cms/types";
import { Still } from "@/components/ui/Still";
import { Waveform } from "@/components/motion/Waveform";
import { useLightbox } from "@/components/media/LightboxProvider";
import { SoundProvider, useSound } from "@/components/work/SoundContext";
import { HeroWordmark } from "@/components/home/HeroWordmark";

// The current slate, in order — the hero the loader reveals to. KODE motion:
// each column drifts continuously (Ken-Burns), and hover/focus expands it and
// blooms the still to full colour.
//
// Desktop only. A phone gets HeroWordmark instead: these columns depend on
// hover, and a full-height phone column crops a 16:9 still to a 1:2.6 sliver.
// The same six films feed both — the wordmark's masking strip is generated
// from the hero slate by `npm run wordmark`. Ordering now lives in the
// database (projects.hero_rank), which is also what stops a poster-less film
// from ever reaching this component.
function Columns({ columns }: { columns: Project[] }) {
  const { open } = useLightbox();
  const [active, setActive] = useState<number | null>(null);

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <div className="hidden h-[calc(100*var(--vh))] w-full gap-[2px] bg-line md:flex">
      {columns.map((p, i) => {
        const hot = active === i;
        return (
          <button
            key={p.slug}
            type="button"
            onClick={() => open(p)}
            aria-label={`${p.title} — ${p.studio}`}
            onMouseEnter={() => canHover() && setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            // `flex-1` is the resting layout, in CSS, so equal columns survive
            // even if this never hydrates. The inline style takes over only once
            // a column is hovered — the one part that genuinely needs JS.
            style={active !== null ? { flexGrow: hot ? 2.6 : 0.7 } : undefined}
            className="group relative block min-w-0 flex-1 overflow-hidden text-left outline-none transition-[flex-grow] duration-[600ms] ease-signature focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text"
          >
            {/* Ambient drift frame — slightly oversized so the pan never shows edges. */}
            <div
              // Full colour is the base state. The desaturated resting look is
              // the hover affordance, so it only applies where hover exists —
              // otherwise a phone shows six permanently grey stills.
              className={`absolute inset-[-6%] transition-[filter] duration-500 ease-signature ${
                hot
                  ? "saturate-100 brightness-100"
                  : "can-hover:saturate-[0.18] can-hover:brightness-[0.62]"
              }`}
            >
              <div
                className="drift-col relative h-full w-full"
                style={{ animationDelay: `${i * -3.1}s`, animationDuration: `${13 + i * 2}s` }}
              >
                <Still
                  slug={p.slug}
                  src={p.still}
                  title={p.title}
                  // No `priority` here. It emits a <link rel=preload>, which
                  // ignores the `hidden md:flex` above it — a phone would fetch
                  // a full-height hero still for a hero it never renders. The
                  // wordmark strip carries priority instead; desktop still
                  // requests this the moment layout resolves.
                  sizes="50vw"
                  quality={90}
                  className="object-[50%_38%]"
                />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-ink/20" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 md:p-5">
              <div
                className={`transition-opacity duration-500 ease-out ${hot ? "opacity-100" : "opacity-0"}`}
              >
                <Waveform bars={12} height={14} active={hot} playing={false} />
              </div>
              <h2 className="mt-3 truncate text-base uppercase tracking-[-0.01em] text-text">
                {p.title}
              </h2>
              <p className="mt-1 truncate font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                {p.studio}
              </p>
            </div>

          </button>
        );
      })}
    </div>
  );
}

export function HeroC({ columns }: { columns: Project[] }) {
  return (
    <SoundProvider>
      <section className="relative">
        <HeroWordmark />
        <Columns columns={columns} />

        {/* Hero chrome, lifted to the top so it never collides with the column
            captions (6 columns leave no room at the bottom corners). */}
        <div className="gutter pointer-events-none absolute inset-x-0 top-16 z-20 flex items-start justify-end gap-6 md:top-20">
          <Link
            href="/work"
            className="pointer-events-auto hidden font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text md:inline-flex"
          >
            View all work →
          </Link>
        </div>
      </section>
    </SoundProvider>
  );
}
