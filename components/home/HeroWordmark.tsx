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
// Behind the word sits a triptych — three films in clean left / centre / right
// thirds — spanning both lines at once: BOOM reveals its top half, ERANG its
// bottom, so a film runs vertically through the whole word rather than each row
// repeating the set. Two triptychs are stacked and cross-dissolved, so the
// composition changes as a single cut. Nothing slides, pans or tiles; this is a
// title treatment, not a ticker.
//
// Both triptychs are built by `npm run wordmark` from the same HERO_SLUGS the
// desktop columns use.
const TRIPTYCH_A = "/assets/hero/wordmark-a.jpg";
const TRIPTYCH_B = "/assets/hero/wordmark-b.jpg";

// `w-fit` is load-bearing. A block <p> fills its container, so scaleX would
// stretch the whole 335px box and push the page sideways while the glyphs sat
// small inside it. Hugging the text means the scale acts on the letters.
//
// BOOM and ERANG don't measure the same — four wide glyphs come out ~9%
// narrower than five narrow ones — so they take different scales to finish
// flush. Both land within a couple of pixels of the gutter.
const SIZE = "w-fit origin-left text-[clamp(3.5rem,26vw,8rem)]";
const SCALE_BOOM = { transform: "scaleX(1.16)" };
const SCALE_ERANG = { transform: "scaleX(1.06)" };

// `background-size: 100% 200%` makes the triptych twice the height of one line,
// so the two rows sample its top and bottom halves and the thirds stay aligned
// between them.
const line =
  "m-0 block bg-no-repeat font-semibold uppercase leading-[0.82] tracking-[-0.045em] text-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] [background-clip:text] [background-size:100%_200%]";

function Lines({ src, hidden }: { src: string; hidden?: boolean }) {
  return (
    <div aria-hidden={hidden || undefined} style={{ ["--tri" as string]: `url(${src})` }}>
      <p
        className={`${line} ${SIZE} bg-[image:var(--tri)] [background-position:0%_0%]`}
        style={SCALE_BOOM}
      >
        Boom
      </p>
      <p
        className={`${line} ${SIZE} -mt-[0.06em] bg-[image:var(--tri)] [background-position:0%_100%]`}
        style={SCALE_ERANG}
      >
        Erang
      </p>
    </div>
  );
}

export function HeroWordmark() {
  return (
    <>
      {/* The triptych is a CSS background, so it can't take next/image's
          `priority`. It is the mobile LCP, though, so preload it by hand —
          `media` keeps desktop from fetching a mask it never paints. The second
          triptych needs no hint: an opacity-0 element still fetches its
          background (unlike display:none), so it lands long before the first
          dissolve at five seconds. React hoists this to the head. */}
      <link rel="preload" as="image" href={TRIPTYCH_A} media="(max-width: 767px)" />

      <div
        // overflow-hidden is a guard: scaleX doesn't change the layout box but
        // does extend the scrollable area, so an over-scaled line would push the
        // whole page sideways.
        className="hero-wordmark relative flex h-[calc(100*var(--vh))] flex-col justify-center overflow-hidden px-5 md:hidden"
      >
        <div className="relative">
          <Lines src={TRIPTYCH_A} />

          {/* The second state, stacked exactly over the first and dissolved in
              and out on a 12.4s loop — 5s hold, 1.2s blend, each way. Pure CSS,
              so there's no timer to drift and both rows always change together.
              Under reduced motion it stays at opacity-0 and the hero simply
              rests on the first triptych. */}
          <div className="absolute inset-0 opacity-0 motion-safe:animate-[wordmark-dissolve_12400ms_ease-in-out_infinite]">
            <Lines src={TRIPTYCH_B} hidden />
          </div>

          {/* Threaded through the word rather than parked under it — the point
              is that the music and the films are the same object. Absolutely
              positioned so it can never shift the imagery. `active`, never
              `playing`: --live is reserved for a cue actually sounding. */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
            <Waveform bars={44} height={54} active className="opacity-45" />
          </div>
        </div>
      </div>
    </>
  );
}
