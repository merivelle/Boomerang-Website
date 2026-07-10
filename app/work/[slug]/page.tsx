import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects, getProject } from "@/content/projects";
import { Still } from "@/components/ui/Still";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: `${project.role} for ${project.title} (${project.studio}, ${project.year}) — music and sound design by Boomerang.`,
  };
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="border-t border-line py-5">
    <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
      {label}
    </dt>
    <dd className="mt-2 text-lg uppercase tracking-[-0.02em] text-text">{value}</dd>
  </div>
);

export default async function PlacementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const i = projects.findIndex((p) => p.slug === slug);
  const next = projects[(i + 1) % projects.length];

  return (
    <article className="pb-28 pt-16 md:pt-20">
      <div className="relative h-[50vh] min-h-[320px] w-full overflow-hidden md:h-[66vh]">
        <Still slug={project.slug} title={project.title} priority sizes="100vw" yoyo />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      </div>

      <div className="gutter -mt-16 md:-mt-24">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          {project.category}
        </p>
        <h1 className="mt-4 max-w-[12ch] text-display uppercase text-text">
          {project.title}
        </h1>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div>
            <p className="max-w-[46ch] text-lg leading-relaxed text-muted">
              {project.role} for {project.studio}. Scored and sound-designed to carry a
              single feeling: {project.mood.toLowerCase()}.
            </p>

            {project.trailerUrl ? (
              <a
                href={project.trailerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-10 inline-flex items-center gap-3 border border-line px-7 py-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:border-muted hover:text-text"
              >
                Watch the official trailer <span aria-hidden>↗</span>
              </a>
            ) : (
              <p className="mt-10 max-w-[40ch] border-l border-line pl-5 text-sm leading-relaxed text-faint">
                The trailer for {project.title} is hosted by {project.studio}. We show
                stills here out of respect for their rights.
              </p>
            )}
          </div>

          <dl>
            <Field label="Studio" value={project.studio} />
            <Field label="Year" value={String(project.year)} />
            <Field label="Role" value={project.role} />
            <Field label="Mood" value={project.mood} />
            <Field label="Composer" value={project.composer ?? "Mark Hannah"} />
          </dl>
        </div>

        <div className="mt-24 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-10">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
              Next
            </p>
            <Link
              href={`/work/${next.slug}`}
              className="mt-3 block text-title uppercase text-text transition-colors duration-hover ease-out hover:text-muted"
            >
              {next.title}
            </Link>
          </div>
          <Link
            href="/work"
            className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
          >
            ← All work
          </Link>
        </div>
      </div>
    </article>
  );
}
