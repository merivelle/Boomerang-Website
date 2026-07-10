import type { Metadata } from "next";
import Image from "next/image";
import { clientGroups } from "@/content/clients";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Clients",
  description:
    "Studios, networks, streamers and game publishers Boomerang Music has scored for.",
};

export default function ClientsPage() {
  return (
    <div className="gutter pb-28 pt-28 md:pt-36">
      <PageHeader title="Clients" />

      <div className="space-y-16">
        {clientGroups.map((group) => (
          <section key={group.label}>
            <div className="flex items-center gap-5">
              <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
                {group.label}
              </h2>
              <span className="h-px flex-1 bg-line" />
              <span className="font-mono text-[0.7rem] tabular-nums text-faint">
                {String(group.clients.length).padStart(2, "0")}
              </span>
            </div>

            {/* Per-cell borders, not a gap-px fill — a ragged final row stays clean. */}
            <ul className="mt-6 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-4">
              {group.clients.map((client) => (
                <li key={client.slug}>
                  <div className="flex h-24 items-center justify-center border-b border-r border-line px-6 transition-colors duration-hover ease-out hover:bg-s1 md:h-28">
                    {client.logo ? (
                      <Image
                        src={`/assets/logos/${client.logo}.png`}
                        alt={client.name}
                        width={160}
                        height={40}
                        className="max-h-8 w-auto opacity-70 transition-opacity duration-hover ease-out hover:opacity-100"
                      />
                    ) : (
                      <span className="text-center text-sm uppercase tracking-[-0.01em] text-faint transition-colors duration-hover ease-out hover:text-text md:text-base">
                        {client.name}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
