"use client";

import { Waveform } from "@/components/motion/Waveform";

// The mobile hero. The word is the image: BOOMERANG set large over two lines,
// with the current slate visible only inside the letterforms.
//
// Why not the desktop columns, scaled down: a still is 1600×900, and a
// full-height phone column is 308×812. `object-cover` there keeps the height
// and discards 86% of the width, so every frame arrives as a vertical sliver
// with the composition cut out of it. A letterform is a window of a shape we
// choose, which sidesteps that entirely.
//
// Two lines rather than one because nine letters across 375px is ~29px each,
// and at that width a film still stops reading as film. BOOM / ERANG is ~62px
// per letter and still fills the screen.
//
// The strip behind the type is built by `npm run wordmark` from the same
// HERO_SLUGS the desktop columns use.
const STRIP = "/assets/hero/wordmark-strip.jpg";

// One strip spanning both lines: BOOM takes the first half (films 1–3), ERANG
// the second (4–6), so all six are distributed across the word rather than each
// line repeating the set.
// `w-fit` matters more than it looks. A block <p> fills its container, so
// scaleX stretched the whole 335px box and pushed the page sideways while the
// glyphs sat small in the middle of it. Hugging the text means the scale acts
// on the letters, which is the point.
//
// BOOM and ERANG don't measure the same — four wide glyphs come out ~9% narrower
// than five narrow ones — so they take different scales to end up flush.
const SIZE = "w-fit origin-left text-[clamp(3.5rem,26vw,8rem)]";

const line =
  "m-0 block bg-[image:var(--strip)] bg-no-repeat font-semibold uppercase leading-[0.82] tracking-[-0.045em] text-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] [background-clip:text] [background-size:200%_100%] motion-safe:animate-[wordmark-drift_28s_ease-in-out_infinite_alternate]";

export function HeroWordmark() {
  return (
    <>
      {/* The strip is a CSS background, so it can't take next/image's
          `priority`. It is the mobile LCP, though, so preload it by hand —
          `media` keeps desktop from fetching a mask it never paints. React
          hoists this to the head. */}
      <link
        rel="preload"
        as="image"
        href={STRIP}
        media="(max-width: 767px)"
      />
      <div
      // overflow-hidden is load-bearing: scaleX doesn't change the layout box
      // but does extend the scrollable area, so an over-scaled line would push
      // the whole page sideways.
      className="hero-wordmark relative flex h-[calc(100*var(--vh))] flex-col justify-center overflow-hidden px-5 md:hidden"
      style={{ ["--strip" as string]: `url(${STRIP})` }}
    >
      <div className="relative">
        <p
          className={`${line} ${SIZE} [background-position:0%_50%]`}
          style={{ transform: "scaleX(1.16)" }}
        >
          Boom
        </p>
        <p
          className={`${line} ${SIZE} -mt-[0.06em] [background-position:100%_50%]`}
          style={{ transform: "scaleX(1.06)" }}
        >
          Erang
        </p>

        {/* Threaded through the word rather than parked under it — the point is
            that the music and the films are the same object. `active`, never
            `playing`: --live is reserved for a cue actually sounding. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
          <Waveform bars={44} height={54} active className="opacity-45" />
        </div>
      </div>

      <p className="mt-8 font-mono text-[0.7rem] uppercase leading-relaxed tracking-[0.14em] text-faint">
        Universal · Lucasfilm · Lionsgate · 20th&nbsp;Century · Amazon&nbsp;MGM
      </p>
      </div>
    </>
  );
}
