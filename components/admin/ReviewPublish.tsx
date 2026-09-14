"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { discardEverything, discardOne, publishDrafts } from "@/app/(admin)/admin/(app)/publish/actions";
import { Badge, Button, ButtonAnchor, Card, ConfirmDialog, EmptyState, PageTitle, useToast } from "./ui";

type Table =
  | "projects"
  | "clients"
  | "site_settings"
  | "seo_pages"
  | "site_credits"
  | "homepage"
  | "categories"
  | "tags";

export type ReviewItem = {
  id: string;
  table: Table;
  op: "insert" | "update" | "delete";
  label: string;
  summary: string | null;
  updatedAt: string;
  href: string | null;
};

// The section a change belongs to, named the way the sidebar names it.
const SECTION: Record<Table, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  projects: { label: "Work", icon: Sparkles },
  homepage: { label: "Homepage", icon: LayoutDashboard },
  clients: { label: "Clients", icon: Building2 },
  site_credits: { label: "About", icon: UserRound },
  site_settings: { label: "Settings", icon: Settings },
  seo_pages: { label: "Search & sharing", icon: Search },
  categories: { label: "Work filters", icon: SlidersHorizontal },
  tags: { label: "Work filters — tags", icon: Tag },
};

const OP_BADGE = {
  insert: { tone: "info", text: "New" },
  update: { tone: "draft", text: "Edited" },
  delete: { tone: "danger", text: "Removing" },
} as const;

export function ReviewPublish({
  drafts,
  lastPublished,
}: {
  drafts: ReviewItem[];
  lastPublished: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(() => drafts.map((d) => d.id));
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const groups = useMemo(() => {
    const by = new Map<Table, ReviewItem[]>();
    for (const d of drafts) by.set(d.table, [...(by.get(d.table) ?? []), d]);
    return [...by.entries()];
  }, [drafts]);

  const toggle = (id: string) =>
    setSelected((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  function publish() {
    setFailures({});
    start(async () => {
      const res = await publishDrafts(selected);

      if (res.failed.length) {
        setFailures(Object.fromEntries(res.failed.map((f) => [f.id, f.error ?? "Couldn't publish."])));
        toast.error(
          res.published > 0
            ? `Published ${res.published}. ${res.failed.length} couldn't go live — see below.`
            : "Nothing could be published. See the notes below.",
        );
      } else {
        toast.success(
          res.published === 1 ? "1 change is now on the website." : `${res.published} changes are now on the website.`,
        );
      }
      router.refresh();
    });
  }

  function discard(id: string) {
    start(async () => {
      await discardOne(id);
      toast.info("Change discarded. The website is unchanged.");
      router.refresh();
    });
  }

  if (!drafts.length) {
    return (
      <>
        <PageTitle
          title="Review & publish"
          description="Changes you make are held here until you publish them."
        />
        <div className="mt-8">
          <EmptyState
            icon={CheckCircle2}
            title="Everything is published"
            description={
              lastPublished
                ? `The website matches the editor. Last published ${when(lastPublished)}.`
                : "The website matches the editor. Nothing is waiting."
            }
            action={
              <Button variant="secondary" onClick={() => router.push("/admin/work")}>
                Go to Work
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Review & publish"
        description={
          <>
            {drafts.length === 1 ? "1 change is" : `${drafts.length} changes are`} waiting. Nothing
            here is on the website yet.
            {lastPublished && <> Last published {when(lastPublished)}.</>}
          </>
        }
        action={
          <>
            <ButtonAnchor href="/api/admin/preview?to=/" target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              Preview
            </ButtonAnchor>
            <Button variant="primary" loading={pending} disabled={!selected.length} onClick={publish}>
              <UploadCloud className="h-4 w-4" />
              {selected.length === drafts.length
                ? "Publish everything"
                : `Publish ${selected.length} of ${drafts.length}`}
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[0.875rem] text-zinc-600">
          <input
            type="checkbox"
            checked={selected.length === drafts.length}
            onChange={(e) => setSelected(e.target.checked ? drafts.map((d) => d.id) : [])}
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
          />
          Select all
        </label>
        <Button size="sm" variant="quiet" onClick={() => setConfirmDiscardAll(true)}>
          Discard all changes
        </Button>
      </div>

      <div className="mt-4 space-y-5">
        {groups.map(([table, items]) => {
          const Icon = SECTION[table].icon;
          return (
            <Card key={table}>
              <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-3">
                <Icon className="h-4 w-4 text-zinc-400" />
                <h2 className="admin-h3">{SECTION[table].label}</h2>
                <span className="admin-hint">
                  {items.length === 1 ? "1 change" : `${items.length} changes`}
                </span>
              </div>

              <ul className="divide-y divide-zinc-100">
                {items.map((d) => (
                  <li key={d.id} className="flex items-start gap-3 px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggle(d.id)}
                      aria-label={`Publish ${d.label}`}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {d.href ? (
                          <Link
                            href={d.href}
                            className="truncate text-[0.9375rem] font-medium text-zinc-900 underline-offset-2 hover:underline"
                          >
                            {d.label}
                          </Link>
                        ) : (
                          <span className="truncate text-[0.9375rem] font-medium text-zinc-900">
                            {d.label}
                          </span>
                        )}
                        <Badge tone={OP_BADGE[d.op].tone}>{OP_BADGE[d.op].text}</Badge>
                      </div>

                      {d.summary && <p className="admin-hint mt-0.5">{d.summary}</p>}
                      <p className="mt-0.5 text-[0.75rem] text-zinc-400">Edited {when(d.updatedAt)}</p>

                      {failures[d.id] && (
                        <p
                          role="alert"
                          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[0.8125rem] leading-relaxed text-red-700"
                        >
                          {failures[d.id]}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => discard(d.id)}
                      disabled={pending}
                      aria-label={`Discard the change to ${d.label}`}
                      title="Discard this change"
                      className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmDiscardAll}
        onClose={() => setConfirmDiscardAll(false)}
        busy={pending}
        title="Discard every change?"
        confirmLabel="Discard everything"
        body={
          <>
            All {drafts.length} unpublished changes will be thrown away and the editor will go back
            to matching the website. The website itself doesn&rsquo;t change — it never had these
            edits. This can&rsquo;t be undone.
          </>
        }
        onConfirm={() =>
          start(async () => {
            await discardEverything();
            setConfirmDiscardAll(false);
            toast.info("All changes discarded.");
            router.refresh();
          })
        }
      />
    </>
  );
}

/** "3 minutes ago" — relative up to a week, then a plain date. */
function when(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
