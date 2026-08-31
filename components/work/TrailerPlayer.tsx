"use client";

import Image from "next/image";
import { useState } from "react";
import { youTubeEmbed } from "@/lib/youtube";

/**
 * The still, with the trailer behind it.
 *
 * Deliberately not an iframe on load: an autoplaying embed the moment a page
 * opens is the behaviour the lightbox gets away with because a click already
 * asked for it. Here the frame is the page's own image, and the embed only
 * mounts once someone asks — which also keeps YouTube's script off the page
 * for everyone who does not.
 */
export function TrailerPlayer({
  src,
  title,
  trailerUrl,
  focal,
  priority,
}: {
  src: string;
  title: string;
  trailerUrl?: string;
  focal?: { x: number; y: number };
  priority?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const embed = trailerUrl ? youTubeEmbed(trailerUrl) : null;

  if (playing && embed) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <iframe
          src={embed}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  const frame = (
    <>
      <Image
        src={src}
        alt={title}
        fill
        sizes="100vw"
        priority={priority}
        style={focal ? { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` } : undefined}
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
    </>
  );

  if (!embed) {
    return <div className="relative aspect-video w-full overflow-hidden bg-s1">{frame}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play the ${title} trailer`}
      className="group relative block aspect-video w-full overflow-hidden bg-s1"
    >
      {frame}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-text/40 bg-ink/40 backdrop-blur-sm transition-colors duration-hover ease-out group-hover:border-text group-hover:bg-ink/60 md:h-20 md:w-20">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6 text-text md:h-7 md:w-7" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      <span className="absolute bottom-4 left-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted md:bottom-6 md:left-6">
        Watch the trailer
      </span>
    </button>
  );
}
