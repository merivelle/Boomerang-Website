import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "About",
  description: site.intro,
};

export default function AboutPage() {
  return (
    <div className="gutter pb-28 pt-28 md:pt-36">
      <PageHeader title="About" />

      <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            {site.founder} · {site.role}
          </p>

          <div className="mt-8 max-w-[65ch] space-y-6">
            {site.bio.map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-muted">
                {para}
              </p>
            ))}
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
            {site.stats.map((s) => (
              <div key={s.label} className="border-b border-line py-5">
                <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                  {s.label}
                </dt>
                <dd className="mt-2 text-lg uppercase tracking-[-0.02em] text-text">
                  {s.value}
                </dd>
              </div>
            ))}
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
