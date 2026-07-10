"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// `active`  — bars animate (ambient).
// `playing` — a cue is actually sounding. The ONLY place --live appears.
export function Waveform({
  bars = 32,
  active = false,
  playing = false,
  className,
  height = 24,
}: {
  bars?: number;
  active?: boolean;
  playing?: boolean;
  className?: string;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const animating = mounted && !reduced && (active || playing);

  // Deterministic rest heights, rounded so the SSR string matches Motion's
  // client-rounded style (an unrounded float is a hydration mismatch).
  const heights = Array.from({ length: bars }, (_, i) => {
    const seed = Math.sin((i + 1) * 12.9898) * 43758.5453;
    return ((0.22 + (seed - Math.floor(seed)) * 0.78) * 100).toFixed(2);
  });

  return (
    <div
      className={`flex items-center gap-[2px] ${className ?? ""}`}
      style={{ height }}
      aria-hidden
    >
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className={`w-[2px] shrink-0 ${playing ? "bg-live" : "bg-muted"}`}
          style={{ height: `${h}%` }}
          initial={{ scaleY: 1 }}
          animate={animating ? { scaleY: [1, 1.4, 0.65, 1] } : { scaleY: 1 }}
          transition={
            animating
              ? { duration: 0.9 + (i % 5) * 0.15, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.25 }
          }
        />
      ))}
    </div>
  );
}
