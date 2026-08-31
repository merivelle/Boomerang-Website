import Link from "next/link";
import { HeroC } from "@/components/home/HeroC";
import { SelectedWorkIndex } from "@/components/home/SelectedWorkIndex";
import { ClientsMarquee } from "@/components/clients/ClientsMarquee";
import { WorkGallery } from "@/components/home/WorkGallery";
import { EmailSignup } from "@/components/contact/EmailSignup";
import { LightboxProvider } from "@/components/media/LightboxProvider";
import {
  getFeatured,
  getHeroColumns,
  getHomeGrid,
  getLogoClients,
} from "@/lib/cms/queries";

// The homepage the loader reveals to. One scroll:
// Hero C → Selected Work → Clients → Work gallery → Contact. Nav links jump to
// the anchors; the deep pages (/work, /about, /contact, /clients) exist for depth.
export default async function HomePage() {
  const [columns, featured, gallery, logos] = await Promise.all([
    getHeroColumns(),
    getFeatured(),
    getHomeGrid(24),
    getLogoClients(),
  ]);

  return (
    <LightboxProvider>
      <HeroC columns={columns} />

      <section id="work" className="gutter scroll-mt-24 py-20 md:py-28">
        <SelectedWorkIndex films={featured} />
      </section>

      <section id="clients" className="scroll-mt-24 border-y border-line py-10 md:py-20">
        <div className="gutter mb-5 flex items-end justify-between md:mb-8">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            Clients
          </p>
          <Link
            href="/clients"
            className="inline-flex min-h-11 items-center font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
          >
            Full roster →
          </Link>
        </div>
        <ClientsMarquee clients={logos} />
      </section>

      {/* The rest of the work — the archive contact sheet */}
      <section id="gallery" className="scroll-mt-24 py-16 md:py-20">
        <WorkGallery projects={gallery.rows} total={gallery.total} />
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="gutter scroll-mt-24 border-t border-line py-20 md:py-28"
      >
        <p className="text-display uppercase text-text">Contact</p>
        <EmailSignup />
      </section>
    </LightboxProvider>
  );
}
