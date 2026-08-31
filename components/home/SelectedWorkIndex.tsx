"use client";

import { useMemo } from "react";
import type { Project } from "@/lib/cms/types";
import { HoverIndex, type IndexItem } from "@/components/work/HoverIndex";
import { Waveform } from "@/components/motion/Waveform";
import { useLightbox } from "@/components/media/LightboxProvider";

// The slate is whatever carries a featured_rank, in curated order - which is
// file order today and an editor's drag tomorrow. Not year order: The Revenant
// (2015) leads and Cocaine Bear (2023) follows.
type FilmItem = IndexItem & Project;

function Index({ films }: { films: Project[] }) {
  const { open } = useLightbox();

  const items = useMemo<FilmItem[]>(
    () =>
      films.map((f) => ({
        ...f,
        key: f.slug,
        bgSlug: f.slug,
        bgStill: f.still,
        bgTitle: f.title,
        bgClip: f.clip,
      })),
    [films],
  );

  return (
    <HoverIndex
      items={items}
      // Touch devices can't hover, so the slate walks itself instead.
      autoCycleMs={4000}
      onSelect={(_item, i) => open(films[i])}
      renderRow={(item, active, i) => (
        <div className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 md:gap-6">
          <span className="font-mono text-[0.7rem] tabular-nums text-faint md:text-[0.62rem]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>
            <span
              className={`block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-faint md:text-[0.5rem] transition-opacity duration-300 ease-signature ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              {item.role}
            </span>
            <span className="flex items-center gap-3">
              <span
                className={`text-[clamp(1.1rem,3.4vw,2.1rem)] font-normal uppercase leading-[1.05] tracking-[-0.02em] transition-colors duration-300 ease-signature ${
                  active ? "index-title" : "index-title-idle"
                }`}
              >
                {item.title}
              </span>
              <span
                className={`transition-opacity duration-300 ease-out ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              >
                <Waveform bars={5} height={12} active={active} playing={active} />
              </span>
            </span>
          </span>
          <span className="text-right font-mono text-[0.7rem] uppercase leading-snug tracking-[0.12em] text-faint md:text-[0.58rem]">
            {item.studio}
            <br />
            <span className="tabular-nums">{item.year}</span>
          </span>
        </div>
      )}
    />
  );
}

export function SelectedWorkIndex({ films }: { films: Project[] }) {
  return (
    <>
      <div className="mb-5 flex items-end justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
          Selected work
        </p>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint md:text-[0.58rem]">
          Click to watch
        </p>
      </div>
      <Index films={films} />
    </>
  );
}
