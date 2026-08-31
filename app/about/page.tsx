import type { Metadata } from "next";
import Link from "next/link";
import { getSite, getSiteCredits, seoMetadata } from "@/lib/cms/queries";
import { PageHeader } from "@/components/ui/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return seoMetadata("/about", { title: "About", description: site.intro });
}

export default async function AboutPage() {
  const [site, creditTitles] = await Promise.all([getSite(), getSiteCredits()]);

  return (
    <div className="gutter pb-28 pt-28 md:pt-36">
      <PageHeader title="About" />

      <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            {site.founder} · {site.role}
          </p>

          <div className="mt-8 max-w-[62ch] space-y-6">
            <p className="text-lg leading-relaxed text-text md:text-xl">
              {site.bio}
            </p>
            <p className="text-base leading-relaxed text-muted">
              {site.creditsLead}{" "}
              {creditTitles.map((title, i, arr) => (
                <span key={title}>
                  <span className="font-medium text-text">{title}</span>
                  {i < arr.length - 2 ? ", " : i === arr.length - 2 ? ", and " : "."}
                </span>
              ))}
            </p>
          </div>
        </div>

        <aside>
          <dl className="border-t border-line">
            <div className="border-b border-line py-5">
              <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                Founder
              </dt>
              <dd className="mt-2 text-lg uppercase tracking-[-0.02em] text-text">
                {site.founder}
              </dd>
            </div>
            <div className="border-b border-line py-5">
              <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                Based in
              </dt>
              <dd className="mt-2 text-lg uppercase tracking-[-0.02em] text-text">
                {site.location}
              </dd>
            </div>
          </dl>

          <Link
            href="/contact"
            className="mt-10 inline-flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
          >
            Get in touch <span aria-hidden>→</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
