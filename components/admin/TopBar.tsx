import Link from "next/link";
import { CheckCircle2, ExternalLink, UploadCloud } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

/**
 * The strip above every screen. It exists for one reason: an editor should
 * never have to wonder whether what they just typed is on the website. The
 * answer is in the same place on every page.
 */
export function TopBar({ drafts }: { drafts: number }) {
  return (
    <div className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur lg:top-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2.5 md:px-8">
        {drafts > 0 ? (
          <Link
            href="/admin/publish"
            className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-[0.8125rem] font-medium text-violet-800 ring-1 ring-inset ring-violet-600/20 transition-colors hover:bg-violet-100"
          >
            <UploadCloud className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {drafts === 1 ? "1 change" : `${drafts} changes`} not on the website yet
            </span>
            <span aria-hidden className="shrink-0 opacity-60">
              &rarr;
            </span>
          </Link>
        ) : (
          <p className="inline-flex min-w-0 items-center gap-2 text-[0.8125rem] text-zinc-500">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">Everything is published</span>
          </p>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch />
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="hidden sm:inline">View website</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
