"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/content/projects";
import { getProject } from "@/content/projects";
import { Still } from "@/components/ui/Still";
import { Waveform } from "@/components/motion/Waveform";
import { SoundProvider, useSound } from "@/components/work/SoundContext";
import { SoundToggle } from "@/components/work/SoundToggle";

// The current slate, in order — the hero the loader reveals to. KODE motion:
// each column drifts continuously (Ken-Burns), and hover/focus expands it and
// blooms the still to full colour.
const HERO_SLUGS = [
  "the-odyssey",
  "the-hunger-games",
  "the-mandalorian-and-grogu",
  "the-dog-stars",
  "the-end-of-oak-street",
  "masters-of-the-universe",
];
const COLUMNS = HERO_SLUGS.map(getProject).filter(Boolean) as Project[];

function Columns() {
  const { enabled } = useSound();
  const [active, setActive] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  useEffect(() => {
    audioRefs.current.forEach((el, i) => {
      if (!el) return;
      if (active === i && enabled && COLUMNS[i].audio) {
        el.currentTime = 0;
        el.volume = 0.7;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [active, enabled]);

  return (
    <div className="flex h-[calc(100*var(--vh))] w-full gap-[2px] bg-line">
      {COLUMNS.map((p, i) => {
        const hot = active === i;
        const playing = hot && enabled && !!p.audio;
        return (
          <Link
            key={p.slug}
            href={`/work/${p.slug}`}
            aria-label={`${p.title} — ${p.studio}`}
            onMouseEnter={() => canHover() && setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            style={{ flexGrow: hot ? 2.6 : active === null ? 1 : 0.7 }}
            className="group relative block min-w-0 basis-0 overflow-hidden outline-none transition-[flex-grow] duration-[600ms] ease-signature focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text"
          >
            {/* Ambient drift frame — slightly oversized so the pan never shows edges. */}
            <div
              className={`absolute inset-[-6%] transition-[filter] duration-500 ease-signature ${
                hot ? "saturate-100 brightness-100" : "saturate-[0.18] brightness-[0.62]"
              }`}
            >
              <div
                className="drift-col relative h-full w-full"
                style={{ animationDelay: `${i * -3.1}s`, animationDuration: `${13 + i * 2}s` }}
              >
                <Still
                  slug={p.slug}
                  title={p.title}
                  priority={i < 4}
                  sizes="(max-width: 768px) 60vw, 50vw"
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
                <Waveform bars={12} height={14} active={hot} playing={playing} />
              </div>
              <h2 className="mt-3 truncate text-sm uppercase tracking-[-0.01em] text-text md:text-base">
                {p.title}
              </h2>
              <p className="mt-1 truncate font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                {p.studio}
              </p>
            </div>

            {p.audio && (
              <audio
                ref={(el) => {
                  audioRefs.current[i] = el;
                }}
                src={p.audio}
                preload="none"
                loop
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function HeroC() {
  return (
    <SoundProvider>
      <section className="relative">
        <Columns />

        {/* Hero chrome, lifted to the top so it never collides with the column
            captions (6 columns leave no room at the bottom corners). */}
        <div className="gutter pointer-events-none absolute inset-x-0 top-16 z-20 flex items-start justify-end gap-6 md:top-20">
          <Link
            href="/work"
            className="pointer-events-auto hidden font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text md:inline-flex"
          >
            View all work →
          </Link>
          <div className="pointer-events-auto">
            <SoundToggle />
          </div>
        </div>
      </section>
    </SoundProvider>
  );
}
