"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Still } from "@/components/ui/Still";

// The shared hover-list interaction from the motion lab.
// A stacked-still background that glitch-swaps to match the active row, over a
// list whose active row is solid and whose others are ghosted by the caller.
//
// The row content is the caller's job; this owns active state, the background
// crossfade + glitch, keyboard, and the SSR-safe default.
//
// An item may carry a `bgClip` — a silent looping trailer clip that plays over
// its still while the row is active.
//
// Hover is the whole interaction here, so a touch device would otherwise see one
// still and never learn the rest exist. `autoCycleMs` is the answer: on a device
// with no pointer, the active row advances on a timer instead.
export type IndexItem = {
  key: string;
  bgSlug: string;
  bgStill?: string;
  bgFocal?: { x: number; y: number };
  bgTitle: string;
  bgClip?: string;
  href?: string;
};

export function HoverIndex<T extends IndexItem>({
  items,
  renderRow,
  onActivate,
  onSelect,
  className,
  minHeight = "min-h-[400px] md:min-h-[460px]",
  autoCycleMs,
}: {
  items: T[];
  renderRow: (item: T, active: boolean, index: number) => React.ReactNode;
  onActivate?: (index: number) => void;
  // Click/select a row (no href). Rows render as buttons when this is provided.
  onSelect?: (item: T, index: number) => void;
  className?: string;
  // The stage sizes to its rows; this floor keeps a short list cinematic. A long
  // list (all studios) simply grows past it — never clips.
  minHeight?: string;
  // Advance the active row on a timer, but only where there is no pointer to
  // hover with. Opt-in: a long list has no business cycling itself.
  autoCycleMs?: number;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Clips are fetched on first hover, never on load, and stay mounted after so
  // a second pass over the same row is instant.
  const [mounted, setMounted] = useState<number[]>([]);
  // A clip only fades up once it is actually playing, so a missing or
  // undecodable file leaves the still in place instead of a black rectangle.
  const [playing, setPlaying] = useState<number[]>([]);
  // Whether the stage is on screen. One observer, hoisted to state, because both
  // clip playback and the auto-cycle need the answer.
  const [visible, setVisible] = useState(true);
  // Auto-advances skip the glitch — see the glitch effect below.
  const autoAdvanced = useRef(false);

  // Two forms of the same question, deliberately.
  // `canHover()` answers it at event time, which is what the row handlers want.
  // `fine` answers it during render, which is what the cycle needs — and it
  // starts null rather than false so a desktop never briefly cycles before the
  // effect resolves it.
  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const [fine, setFine] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const activate = (i: number) => {
    if (i === active) return;
    setActive(i);
    onActivate?.(i);
  };

  // Separate from activate(), which early-returns on the already-active row —
  // otherwise row 0, active from the first paint, would never load its clip.
  //
  // Gated on canHover() as well as the row's own handler: tapping a row focuses
  // it, and a touch device would otherwise pull down a clip it can never show.
  const mount = (i: number) => {
    if (reduced || !canHover() || !items[i]?.bgClip) return;
    setMounted((prev) => (prev.includes(i) ? prev : [...prev, i]));
  };

  const enter = (i: number) => {
    mount(i);
    activate(i);
  };

  // Fire the glitch on the newly-active frame, then strip it so the settled
  // frame keeps no red fringe. Skipped entirely under reduced motion, and on
  // auto-advance: a 280ms stutter every few seconds unprompted is a strobe, not
  // a signature. Deliberate hover still gets it.
  useEffect(() => {
    if (autoAdvanced.current) {
      autoAdvanced.current = false;
      return;
    }
    if (reduced) return;
    const el = bgRefs.current[active];
    if (!el) return;
    el.classList.remove("glitching");
    void el.offsetWidth;
    el.classList.add("glitching");
    const t = setTimeout(() => el.classList.remove("glitching"), 300);
    return () => clearTimeout(t);
  }, [active, reduced]);

  // Track visibility once. This used to live inside the playback effect with
  // `active` in its deps, which rebuilt the observer on every activation — fine
  // for hover, but a new observer every tick once the cycle is running.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Only the active clip runs, and only while the stage is on screen. The rest
  // rewind so a re-hover starts on the frame the cut was designed to open on.
  useEffect(() => {
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === active && !reduced && visible) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [active, mounted, reduced, visible]);

  // With no pointer, hover can't reveal the other films — so walk them. Stills
  // only: `mount()` still refuses to fetch a clip on a touch device, so this
  // moves the crossfade and nothing downloads.
  useEffect(() => {
    if (!autoCycleMs || reduced || fine !== false || !visible) return;
    if (items.length < 2) return;
    const id = setInterval(() => {
      autoAdvanced.current = true;
      // Not activate(): onActivate means "the visitor chose this row".
      setActive((i) => (i + 1) % items.length);
    }, autoCycleMs);
    return () => clearInterval(id);
  }, [autoCycleMs, reduced, fine, visible, items.length]);

  return (
    <div
      ref={stageRef}
      className={`relative flex overflow-hidden bg-ink ${minHeight} ${className ?? ""}`}
    >
      {/* Background: every still stacked, only the active one shown. */}
      <div className="absolute inset-0">
        {items.map((item, i) => (
          <div
            key={item.key}
            ref={(el) => {
              bgRefs.current[i] = el;
            }}
            className={`absolute inset-0 transition-opacity duration-500 ease-signature ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== active}
          >
            <Still
              slug={item.bgSlug}
              src={item.bgStill}
              focal={item.bgFocal}
              title={item.bgTitle}
              priority={i === 0}
              sizes="100vw"
              className="brightness-[0.5] saturate-[0.8]"
            />
            {item.bgClip && mounted.includes(i) ? (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={item.bgClip}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden
                // Same grade as the still beneath, so the hand-off is invisible.
                className={`absolute inset-0 h-full w-full object-cover brightness-[0.5] saturate-[0.8] transition-opacity duration-500 ease-signature ${
                  i === active && playing.includes(i)
                    ? "opacity-100"
                    : "opacity-0"
                }`}
                onPlaying={() =>
                  setPlaying((prev) =>
                    prev.includes(i) ? prev : [...prev, i],
                  )
                }
                onError={() =>
                  setPlaying((prev) => prev.filter((k) => k !== i))
                }
              />
            ) : null}
          </div>
        ))}
        {/* Left-weighted scrim so the rows always clear contrast. */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/92 via-ink/45 to-ink/10" />
      </div>

      {/* Rows size the stage. Centred within the min-height when short, growing
          past it when long. */}
      <ul className="relative z-10 flex w-full flex-col justify-center px-5 py-10 md:px-8 md:py-14">
        {items.map((item, i) => {
          const isActive = i === active;
          const inner = renderRow(item, isActive, i);
          const shared =
            "block w-full border-t border-text/10 py-2.5 text-left last:border-b focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-live focus-visible:-outline-offset-2";
          return (
            <li key={item.key}>
              {item.href ? (
                <a
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={shared}
                  onMouseEnter={() => canHover() && enter(i)}
                  onFocus={() => enter(i)}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  className={shared}
                  onClick={() => onSelect?.(item, i)}
                  onMouseEnter={() => canHover() && enter(i)}
                  onFocus={() => enter(i)}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
