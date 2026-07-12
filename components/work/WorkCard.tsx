"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/content/projects";
import { Still } from "@/components/ui/Still";
import { Waveform } from "@/components/motion/Waveform";
import { useLightbox } from "@/components/media/LightboxProvider";
import { useSound } from "./SoundContext";

// A frame in the contact sheet. Locked 16/9; the 2px gutter lives on the parent
// grid. At that gap a grid stops reading as cards and starts reading as film.
export function WorkCard({
  project,
  priority,
  sizes,
  fill = false,
}: {
  project: Project;
  priority?: boolean;
  sizes?: string;
  /** Stretch to the parent's height instead of locking 16/9 (hero contact sheet). */
  fill?: boolean;
}) {
  const { enabled } = useSound();
  const { open } = useLightbox();
  const [hot, setHot] = useState(false); // hover OR keyboard focus
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gate hover: touch devices synthesise a mouseenter on tap, which would fire
  // the cue and the scale on the way to navigating away.
  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (hot && enabled && project.audio) {
      // Restart from frame one. This is what separates "a clip appeared" from
      // "the clip started".
      el.currentTime = 0;
      el.volume = 0.7;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [hot, enabled, project.audio]);

  const playing = hot && enabled && !!project.audio;

  return (
    <button
      type="button"
      onClick={() => open(project)}
      aria-label={`${project.title} — ${project.studio}`}
      className={`group relative block w-full overflow-hidden bg-s1 text-left ${fill ? "h-full" : ""}`}
      onMouseEnter={() => canHover() && setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
    >
      <div
        className={`relative w-full overflow-hidden ${fill ? "h-full" : "aspect-video"}`}
      >
        <Still
          slug={project.slug}
          title={project.title}
          priority={priority}
          sizes={sizes}
          className={[
            // Named properties only — never `transition-all`.
            "transition-[filter,transform] duration-hover ease-signature",
            hot
              ? "saturate-100 brightness-100 scale-[1.03]"
              : "saturate-[0.25] brightness-[0.8] scale-100",
          ].join(" ")}
        />

        {/* Scrim so the caption always clears contrast over unpredictable imagery */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent transition-opacity duration-hover ease-out ${
            hot ? "opacity-100" : "opacity-70"
          }`}
        />

        {/* Caption fades up on hover/focus */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div
            className={`transition-[opacity,transform] duration-hover ease-signature ${
              hot ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            <h3 className="text-sm uppercase leading-tight tracking-[-0.01em] text-text">
              {project.title}
            </h3>
            <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              {project.studio} · <span className="tabular-nums">{project.year}</span>
            </p>
          </div>
          <div
            className={`shrink-0 transition-opacity duration-hover ease-out ${
              hot ? "opacity-100" : "opacity-0"
            }`}
          >
            <Waveform bars={14} height={16} active={hot} playing={playing} />
          </div>
        </div>
      </div>

      {project.audio && (
        <audio ref={audioRef} src={project.audio} preload="none" loop />
      )}
    </button>
  );
}
