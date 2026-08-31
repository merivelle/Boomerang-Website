"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/cms/types";
import { youTubeEmbed } from "@/lib/youtube";

// The click target for a film. If the project has an official trailer URL, embed
// the YouTube player; otherwise show the still full-screen with its title,
// studio and year. Portal-rendered so it overlays the whole viewport.
export function Lightbox({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<Element | null>(null);

  // Esc to close + lock background scroll + manage focus while open.
  useEffect(() => {
    if (!project) return;
    restoreFocus.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Silence any hover-to-hear cue that was playing on the clicked card.
    document.querySelectorAll("audio").forEach((a) => a.pause());
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (restoreFocus.current instanceof HTMLElement) restoreFocus.current.focus();
    };
  }, [project, onClose]);

  const onBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!project || typeof document === "undefined") return null;

  const embed = project.trailerUrl ? youTubeEmbed(project.trailerUrl) : null;
  const titleId = "lightbox-title";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={onBackdrop}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/95 p-4 backdrop-blur-sm animate-[fadein_.2s_ease-out] md:p-10"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center text-muted transition-colors duration-hover ease-out hover:text-text md:right-8 md:top-8"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
        </svg>
      </button>

      {embed ? (
        <div className="w-full max-w-[min(92vw,calc(88vh*16/9))]">
          <div className="relative aspect-video w-full overflow-hidden bg-black shadow-2xl">
            <iframe
              src={embed}
              title={project.title}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <h2 id={titleId} className="text-sm uppercase tracking-[-0.01em] text-text md:text-lg">
              {project.title}
            </h2>
            <div className="flex shrink-0 items-baseline gap-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                {project.studio} · <span className="tabular-nums">{project.year}</span>
              </p>
              {/* The lightbox stays the browsing experience; this is how a
                  single credit becomes a link someone can send. */}
              <Link
                href={`/work/${project.slug}`}
                onClick={onClose}
                className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
              >
                Full credit →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <figure className="relative flex h-full max-h-[88vh] w-full max-w-[92vw] items-center justify-center">
          <Image
            src={project.still ?? `/assets/stills/${project.slug}.jpg`}
            alt={project.title}
            fill
            sizes="92vw"
            priority
            className="object-contain"
          />
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-6 md:p-10">
            <h2 id={titleId} className="text-display uppercase leading-[0.95] text-text">
              {project.title}
            </h2>
            <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
              {project.studio} · <span className="tabular-nums">{project.year}</span>
            </p>
          </figcaption>
        </figure>
      )}
    </div>,
    document.body,
  );
}
