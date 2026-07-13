"use client";

import Link from "next/link";
import { projectsByReleaseNewest } from "@/content/projects";
import { WorkCard } from "@/components/work/WorkCard";
import { SoundProvider } from "@/components/work/SoundContext";

// The rest of the body of work — a contact sheet under the hero slate + clients.
// A 2px gutter so it reads as film, not cards. The six hero-column titles are
// left out here (they lead the page already); everything else is the archive.
const HERO_SLUGS = new Set([
  "the-odyssey",
  "the-hunger-games",
  "the-mandalorian-and-grogu",
  "the-dog-stars",
  "the-end-of-oak-street",
  "masters-of-the-universe",
]);
const REST = projectsByReleaseNewest.filter((p) => !HERO_SLUGS.has(p.slug));
// The homepage shows a strong selection; the full archive lives on /work
// (paged + filterable). Real-still credits lead the array, so the cut is curated.
const SHOWN = 24;
const HOME = REST.slice(0, SHOWN);

export function WorkGallery() {
  return (
    <SoundProvider>
      <div className="gutter mb-8 flex items-end justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
          Work
        </p>
        <span className="font-mono text-[0.7rem] tabular-nums text-faint">
          {String(REST.length).padStart(2, "0")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[2px] bg-line sm:grid-cols-3 lg:grid-cols-4">
        {HOME.map((project, i) => (
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
          className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted transition-colors duration-hover ease-out hover:text-text"
        >
          View all work →
        </Link>
      </div>
    </SoundProvider>
  );
}
