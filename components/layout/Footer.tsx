import Link from "next/link";
import type { NavItem, SiteSettings } from "@/lib/cms/types";

export function Footer({ site, nav }: { site: SiteSettings; nav: NavItem[] }) {
  return (
    <footer className="gutter border-t border-line pb-8 pt-16">
      {/* No tagline. The only display word on the page is the company's name. */}
      <p className="text-title uppercase text-text">{site.name}</p>

      <div className="mt-16 grid gap-10 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            Contact
          </p>
          <a
            href={site.phoneHref ?? "#"}
            className="mt-1 inline-flex min-h-11 items-center font-mono text-sm tabular-nums text-muted transition-colors duration-hover ease-out hover:text-text"
          >
            {site.phone}
          </a>
        </div>
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            Elsewhere
          </p>
          <a
            href={site.instagramUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex min-h-11 items-center text-sm text-muted transition-colors duration-hover ease-out hover:text-text"
          >
            @{site.instagramHandle}
          </a>
        </div>
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            Index
          </p>
          <ul className="mt-3 space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-sm text-muted transition-colors duration-hover ease-out hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-12 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
        © <span className="tabular-nums">{site.copyrightYear}</span> {site.name} Music
      </p>
    </footer>
  );
}
