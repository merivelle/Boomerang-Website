"use client";

import { Waveform } from "@/components/motion/Waveform";
import { useSound } from "./SoundContext";

// Sits where this category habitually puts its theme toggle. Every competitor
// ships a silent site; for a composer the sound IS the product.
export function SoundToggle({ className = "" }: { className?: string }) {
  const { enabled, toggle } = useSound();
  return (
    <button
      onClick={toggle}
      aria-pressed={enabled}
      className={`group flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text ${className}`}
    >
      <Waveform bars={12} height={14} active playing={enabled} />
      {enabled ? "Sound on" : "Hover to hear"}
    </button>
  );
}
