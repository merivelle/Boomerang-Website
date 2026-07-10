"use client";

import { useRef } from "react";
import { featured } from "@/content/projects";
import { HoverIndex, type IndexItem } from "@/components/work/HoverIndex";
import { Waveform } from "@/components/motion/Waveform";
import { SoundProvider, useSound } from "@/components/work/SoundContext";
import { SoundToggle } from "@/components/work/SoundToggle";

const FILMS = featured.slice(0, 6);
type FilmItem = IndexItem & (typeof FILMS)[number];

const items: FilmItem[] = FILMS.map((f) => ({
  ...f,
  key: f.slug,
  bgSlug: f.slug,
  bgTitle: f.title,
  href: `/work/${f.slug}`,
}));

function Index() {
  const { enabled } = useSound();
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const onActivate = (i: number) => {
    audioRefs.current.forEach((el, k) => {
      if (!el) return;
      if (k === i && enabled && items[i].audio) {
        el.currentTime = 0;
        el.volume = 0.7;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  };

  return (
    <>
      <HoverIndex
        items={items}
        onActivate={onActivate}
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
                  <Waveform
                    bars={5}
                    height={12}
                    active={active}
                    playing={active && enabled && !!item.audio}
                  />
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
      {items.map((item, i) =>
        item.audio ? (
          <audio
            key={item.key}
            ref={(el) => {
              audioRefs.current[i] = el;
            }}
            src={item.audio}
            preload="none"
            loop
          />
        ) : null,
      )}
    </>
  );
}

export function SelectedWorkIndex() {
  return (
    <SoundProvider>
      <div className="mb-5 flex items-end justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
          Selected work
        </p>
        <SoundToggle />
      </div>
      <Index />
    </SoundProvider>
  );
}
