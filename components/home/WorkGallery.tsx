"use client";

import Link from "next/link";
import type { Project } from "@/lib/cms/types";
import { WorkCard } from "@/components/work/WorkCard";
import { SoundProvider } from "@/components/work/SoundContext";

// The rest of the body of work — a contact sheet under the hero slate + clients.
// A 2px gutter so it reads as film, not cards. The six hero-column titles are
// left out here (they lead the page already); everything else is the archive.
// That exclusion is now `hero_rank is null` in SQL, which is how the second
// copy of the hero slate stopped existing.
//
// `total` is every non-hero credit (55), NOT the 24 rendered below — it is the
// number in the badge. Using projects.length here would print a plausible
// wrong count.
export function WorkGallery({
  projects,
  total,
}: {
  projects: Project[];
  total: number;
}) {
  return (
    <SoundProvider>
      <div className="gutter mb-8 flex items-end justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
          Work
        </p>
        <span className="font-mono text-[0.7rem] tabular-nums text-faint">
          {String(total).padStart(2, "0")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[2px] bg-line sm:grid-cols-3 lg:grid-cols-4">
        {projects.map((project, i) => (
          <WorkCard
            key={project.slug}
            project={project}
            priority={i < 4}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ))}
      </div>

      <div className="gutter mt-8 flex justify-end">
        <Link
          href="/work"
          className="inline-flex min-h-11 items-center font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
        >
          View all work →
        </Link>
      </div>
    </SoundProvider>
  );
}
