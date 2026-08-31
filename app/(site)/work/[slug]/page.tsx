import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjectContext, getPublishedSlugs, getSite } from "@/lib/cms/queries";
import { TrailerPlayer } from "@/components/work/TrailerPlayer";
import { Still } from "@/components/ui/Still";

// Prerendered like the rest of the site; revalidateTag on save keeps them fresh.
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs().catch(() => []);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [project, site] = await Promise.all([getProject(slug), getSite()]);
  if (!project) return { title: "Not found" };

  // The per-credit fields have been in the schema since phase 1 and inert until
  // this route existed. They are overrides, not requirements — the fallback is
  // what a credit reads like with nobody having written anything.
  const title = project.seoTitle || project.title;
  const description =
    project.seoDescription ||
    `${project.role} for ${project.title}, ${project.studio}, ${project.year}. ` +
      `Music and sound design by ${site.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      title: `${title} — ${site.name}`,
      description,
      type: "article",
      images: project.still ? [{ url: project.still, alt: project.title }] : undefined,
    },
  };
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line py-5">
      <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">{label}</dt>
      <dd className="mt-2 text-lg uppercase tracking-[-0.02em] text-text">{value}</dd>
    </div>
  );
}

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const { prev, next, related } = await getProjectContext(slug);

  return (
    <article className="pb-28 pt-24 md:pt-28">
      <div className="gutter">
        <Link
          href="/work"
          className="inline-flex min-h-11 items-center font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
        >
          ← All work
        </Link>
      </div>

      {/* The frame leads, as it does everywhere else on the site. */}
      <div className="mt-6 md:mt-8">
        <TrailerPlayer
          src={project.still!}
          title={project.title}
          trailerUrl={project.trailerUrl}
          focal={project.focal}
          priority
        />
      </div>

      <div className="gutter mt-10 grid gap-12 md:mt-14 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
        <div>
          <h1 className="text-display uppercase leading-[0.9] text-text">{project.title}</h1>
          <p className="mt-6 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
            {project.studio} · <span className="tabular-nums">{project.year}</span>
          </p>

          {!project.trailerUrl && (
            <p className="mt-8 max-w-[50ch] text-sm leading-relaxed text-faint">
              No trailer is linked for this campaign.
            </p>
          )}
        </div>

        <aside>
          <dl className="border-t border-line">
            <Meta label="Client" value={project.studio} />
            <Meta label="Year" value={String(project.year)} />
            <Meta label="Work" value={project.role} />
            <Meta label="Category" value={project.category} />
          </dl>
        </aside>
      </div>

      {/* Previous / next, in the order /work lists them. */}
      <nav className="gutter mt-20 grid gap-px border-y border-line bg-line sm:grid-cols-2">
        {[
          { p: prev, label: "Previous", align: "" },
          { p: next, label: "Next", align: "sm:text-right" },
        ].map(({ p, label, align }) =>
          p ? (
            <Link
              key={label}
              href={`/work/${p.slug}`}
              className={`group bg-ink px-1 py-6 transition-colors duration-hover ease-out hover:bg-s1 ${align}`}
            >
              <span className="block font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                {label}
              </span>
              <span className="mt-2 block text-xl uppercase tracking-[-0.02em] text-muted transition-colors duration-hover ease-out group-hover:text-text md:text-2xl">
                {p.title}
              </span>
            </Link>
          ) : (
            <span key={label} className="bg-ink px-1 py-6" />
          ),
        )}
      </nav>

      {related.length > 0 && (
        <section className="gutter mt-20">
          <p className="mb-6 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
            More from {project.studio}
          </p>
          <div className="grid grid-cols-1 gap-[2px] bg-line sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/work/${r.slug}`} className="group relative block bg-ink">
                <div className="relative aspect-video w-full overflow-hidden">
                  <Still
                    slug={r.slug}
                    src={r.still}
                    focal={r.focal}
                    title={r.title}
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="transition-[filter] duration-hover ease-signature can-hover:saturate-[0.25] can-hover:brightness-[0.8] group-hover:saturate-100 group-hover:brightness-100"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-sm uppercase leading-tight tracking-[-0.01em] text-text">
                      {r.title}
                    </h3>
                    <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                      {r.studio} · <span className="tabular-nums">{r.year}</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
