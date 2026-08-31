"use client";

import { useMemo, useState } from "react";
import type { Category, Project, Tag } from "@/lib/cms/types";
import { WorkCard } from "./WorkCard";
import { SoundProvider } from "./SoundContext";
import { useLightbox } from "@/components/media/LightboxProvider";

const STEP = 12;

// One chip row over two kinds of filter. A category is 1:1 with a credit; a tag
// cuts across categories (Oscar Nominees today, and site.ts already hints at a
// Clio set next). Modelling both as chips means WorkExplorer no longer
// special-cases one filter by name.
type Filter =
  | { label: "All"; kind: "all" }
  | { label: string; kind: "category" }
  | { label: string; kind: "tag"; slug: string };

function IndexRow({ project }: { project: Project }) {
  const { open } = useLightbox();
  return (
    <button
      type="button"
      onClick={() => open(project)}
      className="group grid w-full grid-cols-[1fr_auto] items-baseline gap-4 border-t border-line py-5 text-left transition-colors duration-hover ease-out hover:bg-s1 md:grid-cols-[1fr_1fr_6rem] md:gap-8"
    >
      <span className="text-xl uppercase tracking-[-0.02em] text-text md:text-2xl">
        {project.title}
      </span>
      <span className="hidden font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted md:block">
        {project.studio} · {project.role}
      </span>
      <span className="justify-self-end font-mono text-[0.7rem] tabular-nums text-faint">
        {project.year}
      </span>
    </button>
  );
}

export function WorkExplorer({
  projects,
  categories,
  tags,
}: {
  projects: Project[];
  categories: Category[];
  tags: Tag[];
}) {
  const [cat, setCat] = useState<string>("All");
  const [view, setView] = useState<"grid" | "index">("grid");
  const [count, setCount] = useState(STEP);

  const filters = useMemo<Filter[]>(
    () => [
      { label: "All", kind: "all" },
      ...categories.map((c) => ({ label: c.label, kind: "category" as const })),
      ...tags.map((t) => ({ label: t.label, kind: "tag" as const, slug: t.slug })),
    ],
    [categories, tags],
  );

  const filtered = useMemo(() => {
    const f = filters.find((x) => x.label === cat);
    if (!f || f.kind === "all") return projects;
    if (f.kind === "tag") return projects.filter((p) => p.tags.includes(f.slug));
    return projects.filter((p) => p.category === f.label);
  }, [cat, filters, projects]);
  const visible = view === "index" ? filtered : filtered.slice(0, count);

  return (
    <SoundProvider>
      <div className="sticky top-16 z-30 -mx-[var(--gutter)] mb-8 border-y border-line bg-ink/90 px-[var(--gutter)] py-4 backdrop-blur-sm md:top-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {filters.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setCat(f.label);
                  setCount(STEP);
                }}
                className={`font-mono text-[0.7rem] uppercase tracking-[0.14em] transition-colors duration-hover ease-out ${
                  cat === f.label ? "text-text" : "text-faint hover:text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.14em]">
              <button
                onClick={() => setView("grid")}
                className={
                  view === "grid" ? "text-text" : "text-faint hover:text-muted"
                }
              >
                Grid
              </button>
              <span className="text-line">/</span>
              <button
                onClick={() => setView("index")}
                className={
                  view === "index" ? "text-text" : "text-faint hover:text-muted"
                }
              >
                Index
              </button>
            </div>
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <>
          <div className="grid grid-cols-1 gap-[2px] bg-line sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p, i) => (
              <WorkCard
                key={p.slug}
                project={p}
                priority={i < 3}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ))}
          </div>
          {count < filtered.length && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setCount((c) => c + STEP)}
                className="border border-line px-7 py-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:border-muted hover:text-text"
              >
                View more{" "}
                <span className="tabular-nums text-faint">
                  ({filtered.length - count})
                </span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div>
          {visible.map((p) => (
            <IndexRow key={p.slug} project={p} />
          ))}
          <div className="border-t border-line" />
        </div>
      )}
    </SoundProvider>
  );
}
