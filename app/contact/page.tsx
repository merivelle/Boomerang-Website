import type { Metadata } from "next";
import { site } from "@/content/site";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation with Boomerang Music.",
};

// Editorial contact layout: a giant CONTACT wordmark with a diagonal arrow, then
// the real facts as label→value rows, then the message form. Every value is a
// checkable fact from content/site.ts — no invented address or socials.
const rows: { label: string; value: string; href?: string; external?: boolean }[] = [
  { label: "Phone", value: site.contact.phone, href: site.contact.phoneHref },
  { label: "Mail", value: site.contact.email, href: `mailto:${site.contact.email}` },
  {
    label: "Instagram",
    value: `@${site.contact.instagram}`,
    href: site.contact.instagramHref,
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="gutter pb-28 pt-28 md:pt-36">
      {/* Hero — CONTACT + diagonal arrow */}
      <header className="flex items-start justify-between gap-6">
        <h1 className="text-display uppercase leading-[0.9] text-text">Contact</h1>
        <a
          href={`mailto:${site.contact.email}`}
          aria-label={`Email ${site.contact.email}`}
          className="group mt-2 shrink-0 text-muted transition-colors duration-hover ease-out hover:text-text md:mt-4"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
            className="h-10 w-10 transition-transform duration-hover ease-signature group-hover:translate-x-1 group-hover:translate-y-1 md:h-16 md:w-16"
          >
            <path d="M7 7h10v10" strokeLinecap="square" />
            <path d="M17 7 6 18" strokeLinecap="square" />
          </svg>
        </a>
      </header>

      {/* Editorial rows — label left, value right, thin rules */}
      <dl className="mt-12 md:mt-16">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-6 border-t border-line py-5 md:py-6"
          >
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
              {row.label}
            </dt>
            <dd className="text-right">
              {row.href ? (
                <a
                  href={row.href}
                  {...(row.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className={`text-sm uppercase tracking-[-0.01em] text-text transition-colors duration-hover ease-out hover:text-muted md:text-lg ${
                    row.label === "Phone" ? "font-mono tabular-nums normal-case" : ""
                  }`}
                >
                  {row.value}
                </a>
              ) : (
                <span className="text-sm uppercase tracking-[-0.01em] text-text md:text-lg">
                  {row.value}
                </span>
              )}
            </dd>
          </div>
        ))}
        <div className="border-t border-line" />
      </dl>

      {/* Message form */}
      <section className="mt-20 border-t border-line pt-10 md:mt-28">
        <p className="mb-8 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
          Send a message
        </p>
        <ContactForm />
      </section>
    </div>
  );
}
