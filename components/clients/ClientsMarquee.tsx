import Image from "next/image";
import type { Client } from "@/lib/cms/types";

// Slow logo marquee — the studios' own marks carry the authority. Pure CSS
// (see .animate-marquee). Logos are normalized to white.
//
// The gap and the track's right padding must stay equal: the -50% translate
// assumes each half of the doubled row is exactly the same width, and the
// trailing pad is what stands in for the gap that would follow the last logo.
// Change one without the other and the loop jumps.
export function ClientsMarquee({ clients }: { clients: Client[] }) {
  const row = [...clients, ...clients];
  return (
    <div
      className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      aria-label="Clients"
    >
      <div className="flex shrink-0 animate-marquee items-center gap-8 pr-8 can-hover:group-hover:[animation-play-state:paused] md:gap-16 md:pr-16">
        {row.map((client, i) => (
          <Image
            key={`${client.slug}-${i}`}
            src={client.logo!}
            alt={client.name}
            width={160}
            height={40}
            // The track is ~7000px wide inside overflow-hidden, so lazily-loaded
            // logos never intersect until the transform drags them in — they
            // arrive late and leave gaps drifting past. Eager for the first
            // half; `loading` rather than `priority` so this doesn't put 21
            // preload hints in the document head.
            loading={i < clients.length ? "eager" : "lazy"}
            className="h-9 w-auto opacity-80 transition-opacity duration-hover ease-out hover:opacity-100 md:h-8 md:opacity-60"
          />
        ))}
      </div>
    </div>
  );
}
