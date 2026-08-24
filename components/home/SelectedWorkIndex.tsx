"use client";

import { featured } from "@/content/projects";
import { HoverIndex, type IndexItem } from "@/components/work/HoverIndex";
import { Waveform } from "@/components/motion/Waveform";
import { useLightbox } from "@/components/media/LightboxProvider";

// The slate is whatever `content/projects.ts` marks `featured`, in file order.
const FILMS = featured;
type FilmItem = IndexItem & (typeof FILMS)[number];

const items: FilmItem[] = FILMS.map((f) => ({
  ...f,
  key: f.slug,
  bgSlug: f.slug,
  bgTitle: f.title,
  bgClip: f.clip,
}));

function Index() {
  const { open } = useLightbox();

  return (
    <HoverIndex
      items={items}
      onSelect={(_item, i) => open(FILMS[i])}
      renderRow={(item, active, i) => (
        <div className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 md:gap-6">
          <span className="font-mono text-[0.62rem] tabular-nums text-faint">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>
            <span
              className={`block font-mono text-[0.5rem] uppercase tracking-[0.16em] text-faint transition-opacity duration-300 ease-signature ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              {item.role}
            </span>
            <span className="flex items-center gap-3">
              <span
                className="text-[clamp(1.1rem,3.4vw,2.1rem)] font-normal uppercase leading-[1.05] tracking-[-0.02em] transition-colors duration-300 ease-signature"
                style={{
                  color: active ? "oklch(97% 0 0)" : "transparent",
                  WebkitTextStroke: active ? "0" : "1px oklch(97% 0 0 / 0.4)",
                }}
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
          <span className="text-right font-mono text-[0.58rem] uppercase leading-snug tracking-[0.12em] text-faint">
            {item.studio}
            <br />
            <span className="tabular-nums">{item.year}</span>
          </span>
        </div>
      )}
    />
  );
}

export function SelectedWorkIndex() {
  return (
    <>
      <div className="mb-5 flex items-end justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
          Selected work
        </p>
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">
          Click to watch
        </p>
      </div>
      <Index />
    </>
  );
}
