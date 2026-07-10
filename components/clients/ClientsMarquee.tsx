import Image from "next/image";
import { logoClients } from "@/content/clients";

// Slow logo marquee — the studios' own marks carry the authority. Pure CSS
// (see .animate-marquee), pauses on hover. Logos are normalized to white.
export function ClientsMarquee() {
  const row = [...logoClients, ...logoClients];
  return (
    <div
      className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      aria-label="Clients"
    >
      <div className="flex shrink-0 animate-marquee items-center gap-16 pr-16 group-hover:[animation-play-state:paused]">
        {row.map((client, i) => (
          <Image
            key={`${client.slug}-${i}`}
            src={`/assets/logos/${client.logo}.png`}
            alt={client.name}
            width={160}
            height={40}
            className="h-7 w-auto opacity-60 transition-opacity duration-hover ease-out hover:opacity-100 md:h-8"
          />
        ))}
      </div>
    </div>
  );
}
