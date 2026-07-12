"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Still } from "@/components/ui/Still";

// The shared hover-list interaction from the motion lab.
// A stacked-still background that glitch-swaps to match the active row, over a
// list whose active row is solid and whose others are ghosted by the caller.
//
// Used twice: films (hover → its cue) and studios (hover → its films). The row
// content and any audio are the caller's job; this owns active state, the
// background crossfade + glitch, keyboard, and the SSR-safe default.
export type IndexItem = {
  key: string;
  bgSlug: string;
  bgTitle: string;
  href?: string;
};

export function HoverIndex<T extends IndexItem>({
  items,
  renderRow,
  onActivate,
  onSelect,
  className,
  minHeight = "min-h-[400px] md:min-h-[460px]",
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
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const activate = (i: number) => {
    if (i === active) return;
    setActive(i);
    onActivate?.(i);
  };

  // Fire the glitch on the newly-active frame, then strip it so the settled
  // frame keeps no red fringe. Skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return;
    const el = bgRefs.current[active];
    if (!el) return;
    el.classList.remove("glitching");
    void el.offsetWidth;
    el.classList.add("glitching");
    const t = setTimeout(() => el.classList.remove("glitching"), 300);
    return () => clearTimeout(t);
  }, [active, reduced]);

  return (
    <div
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
              title={item.bgTitle}
              priority={i === 0}
              sizes="100vw"
              className="brightness-[0.5] saturate-[0.8]"
            />
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
                  onMouseEnter={() => canHover() && activate(i)}
                  onFocus={() => activate(i)}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  className={shared}
                  onClick={() => onSelect?.(item, i)}
                  onMouseEnter={() => canHover() && activate(i)}
                  onFocus={() => activate(i)}
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
