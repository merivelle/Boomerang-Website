import type { Metadata } from "next";
import { site } from "@/content/site";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Start a conversation with Boomerang Music.",
};

// Editorial contact layout: a giant CONTACT wordmark, then the message form as
// label→field rows (email / name / message), then phone + Instagram below. The
// email is never displayed — it's reachable only by submitting the form.
const infoRows: { label: string; value: string; href: string; external?: boolean }[] = [
  { label: "Phone", value: site.contact.phone, href: site.contact.phoneHref },
  {
    label: "Instagram",
    value: `@${site.contact.instagram}`,
    href: site.contact.instagramHref,
    external: true,
  },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="gutter pb-28 pt-28 md:pt-36">
      {/* Hero — CONTACT + a decorative arrow (no email link — anti-scrape) */}
      <header className="flex items-start justify-between gap-6">
        <h1 className="text-display uppercase leading-[0.9] text-text">Contact</h1>
        <span aria-hidden className="mt-2 shrink-0 text-muted md:mt-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-10 w-10 md:h-16 md:w-16"
          >
            <path d="M7 7h10v10" strokeLinecap="square" />
            <path d="M17 7 6 18" strokeLinecap="square" />
          </svg>
        </span>
      </header>

      {/* The form — its rows ARE the layout */}
      <div className="mt-12 md:mt-16">
        <ContactForm initialEmail={email} />
      </div>

      {/* Phone + Instagram, below the form */}
      <dl className="mt-16 md:mt-20">
        {infoRows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-6 border-t border-line py-5 md:py-6"
          >
            <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
              {r.label}
            </dt>
            <dd>
              <a
                href={r.href}
                {...(r.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className={`text-sm uppercase tracking-[-0.01em] text-text transition-colors duration-hover ease-out hover:text-muted md:text-lg ${
                  r.label === "Phone" ? "font-mono tabular-nums normal-case" : ""
                }`}
              >
                {r.value}
              </a>
            </dd>
          </div>
        ))}
        <div className="border-t border-line" />
      </dl>
    </div>
  );
}
