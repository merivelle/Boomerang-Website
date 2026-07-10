import Link from "next/link";
import { site } from "@/content/site";
import { HeroC } from "@/components/home/HeroC";
import { SelectedWorkIndex } from "@/components/home/SelectedWorkIndex";
import { ClientsMarquee } from "@/components/clients/ClientsMarquee";
import { WorkGallery } from "@/components/home/WorkGallery";

// The homepage the loader reveals to. One scroll:
// Hero C → Selected Work → Clients → Work gallery → Contact. Nav links jump to
// the anchors; the deep pages (/work, /about, /contact, /clients) exist for depth.
export default function HomePage() {
  return (
    <>
      <HeroC />

      <section id="work" className="gutter scroll-mt-24 py-20 md:py-28">
        <SelectedWorkIndex />
      </section>

      <section id="clients" className="scroll-mt-24 border-y border-line py-16 md:py-20">
        <div className="gutter mb-8 flex items-end justify-between">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            Clients
          </p>
          <Link
            href="/clients"
            className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
          >
            Full roster →
          </Link>
        </div>
        <ClientsMarquee />
      </section>

      {/* The rest of the work — the archive contact sheet */}
      <section id="gallery" className="scroll-mt-24 py-16 md:py-20">
        <WorkGallery />
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="gutter scroll-mt-24 border-t border-line py-20 md:py-28"
      >
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[12ch] text-display uppercase text-text">Contact</p>
          <div className="flex flex-col gap-3">
            <a
              href={site.contact.phoneHref}
              className="font-mono text-2xl tabular-nums text-text transition-colors duration-hover ease-out hover:text-muted"
            >
              {site.contact.phone}
            </a>
            <a
              href={`mailto:${site.contact.email}`}
              className="text-sm text-muted transition-colors duration-hover ease-out hover:text-text"
            >
              {site.contact.email}
            </a>
            <Link
              href="/contact"
              className="mt-2 inline-flex w-fit items-center gap-3 bg-text px-7 py-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              Start a conversation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
