"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Eye } from "lucide-react";
import Link from "next/link";
import { saveSeo, setSharingImage } from "@/app/(admin)/admin/(app)/site-actions";
import { ImageField, type PickableImage } from "./ImageField";
import {
  Badge,
  Button,
  ButtonAnchor,
  Card,
  CardBody,
  CardHeader,
  Field,
  PageTitle,
  cn,
  useToast,
} from "./ui";

export type SeoRow = {
  path: string;
  label: string;
  title: string;
  description: string;
  ogImage: string | null;
  staged: boolean;
};

export type SeoHealth = {
  projectsMissingTrailer: number;
  imagesMissingAlt: number;
  projectsMissingPoster: number;
};

const HOST = "boomerang-music.com";
const TITLE_MAX = 60;
const DESC_MAX = 155;

export function SeoEditor({
  rows,
  siteName,
  health,
  ogOptions,
  siteOgImage,
}: {
  rows: SeoRow[];
  siteName: string;
  health: SeoHealth;
  ogOptions: PickableImage[];
  siteOgImage: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await saveSeo(form);
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(
        res.staged ? "Saved. Publish when you're ready." : "Nothing changed since you last published.",
      );
      router.refresh();
    });
  }

  const pagesDone = rows.filter((r) => r.title && r.description).length;

  // Everything an editor could actually fix, and nothing they couldn't. The
  // sitemap, indexing rules and structured data are the website's job and are
  // deliberately not on this screen.
  const checks = [
    {
      ok: pagesDone === rows.length,
      good: `All ${rows.length} pages have a title and a description`,
      bad: `${rows.length - pagesDone} of ${rows.length} pages still need a title or description`,
      href: null,
    },
    {
      ok: health.projectsMissingTrailer === 0,
      good: "Every visible credit links to a trailer",
      bad: `${health.projectsMissingTrailer} credits have no trailer link, so their poster isn't clickable`,
      href: "/admin/work?status=missing-info",
    },
    {
      ok: health.imagesMissingAlt === 0,
      good: "Every photo is described",
      bad: `${health.imagesMissingAlt} photos have no description`,
      href: "/admin/media",
    },
    {
      ok: health.projectsMissingPoster === 0,
      good: "Every credit has a picture to share",
      bad: `${health.projectsMissingPoster} credits have no poster, so they can't be shared with a picture`,
      href: "/admin/work?status=missing-poster",
    },
  ];

  return (
    <form onSubmit={submit}>
      <PageTitle
        title="Search & sharing"
        description="How each page reads in Google, and what shows when someone shares a link to it."
        action={
          <Button type="submit" variant="primary" loading={pending}>
            Save
          </Button>
        }
      />

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
        >
          {error}
        </p>
      )}

      {/* --------------------------------------------------------- health */}
      <Card className="mt-7">
        <CardHeader
          title="How the site is doing"
          description="Four things worth keeping on top of. Nothing here can hide the site from Google."
        />
        <CardBody>
          <ul className="space-y-2.5">
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[0.875rem]">
                {c.ok ? (
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                )}
                <span className={c.ok ? "text-zinc-600" : "text-zinc-900"}>
                  {c.ok ? c.good : c.bad}
                  {!c.ok && c.href && (
                    <>
                      {" "}
                      <Link
                        href={c.href}
                        className="inline-flex items-center gap-0.5 font-medium text-zinc-900 underline underline-offset-2"
                      >
                        Fix these
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------------- pages */}
      <div className="mt-5 space-y-5">
        {rows.map((r) => (
          <PageBlock
            key={r.path}
            row={r}
            siteName={siteName}
            ogOptions={ogOptions}
            fallbackOg={siteOgImage}
            onPickImage={(mediaId) =>
              start(async () => {
                const res = await setSharingImage(`seo:${r.path}`, mediaId);
                if (res.ok) {
                  toast.success("Sharing image set. Publish when you're ready.");
                  router.refresh();
                } else {
                  toast.error(res.error);
                }
              })
            }
          />
        ))}
      </div>

      <p className="admin-hint mt-6">
        Everything technical — how Google finds and indexes the site, the sitemap, the address of
        each page — is handled by the website itself. There is nothing on this screen that can
        accidentally hide the site from search.
      </p>
    </form>
  );
}

function PageBlock({
  row,
  siteName,
  ogOptions,
  fallbackOg,
  onPickImage,
}: {
  row: SeoRow;
  siteName: string;
  ogOptions: PickableImage[];
  fallbackOg: string | null;
  onPickImage: (mediaId: string) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [desc, setDesc] = useState(row.description);

  // The root layout appends "— Boomerang" to every page except the homepage,
  // whose title is already whole. The preview has to show what Google shows.
  const fullTitle = title ? (row.path === "/" ? title : `${title} — ${siteName}`) : "";
  const shareImage = row.ogImage ?? fallbackOg;

  return (
    <Card>
      <input type="hidden" name="path" value={row.path} />
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {row.label}
            {row.staged && <Badge tone="draft">Edited</Badge>}
          </span>
        }
        description={`${HOST}${row.path === "/" ? "" : row.path}`}
        action={
          <ButtonAnchor
            size="sm"
            href={`/api/admin/preview?to=${encodeURIComponent(row.path)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </ButtonAnchor>
        }
      />

      <CardBody className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Field
            label={
              <span className="flex items-baseline justify-between gap-2">
                Page title
                <Meter value={title.length} max={TITLE_MAX} />
              </span>
            }
            hint="What shows as the blue link in Google."
          >
            {({ id }) => (
              <input
                id={id}
                name={`title:${row.path}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="admin-input"
              />
            )}
          </Field>

          <Field
            label={
              <span className="flex items-baseline justify-between gap-2">
                Description
                <Meter value={desc.length} max={DESC_MAX} />
              </span>
            }
            hint="The grey sentence underneath. Google may write its own if this is left blank."
          >
            {({ id }) => (
              <textarea
                id={id}
                name={`description:${row.path}`}
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="admin-input"
              />
            )}
          </Field>

          <ImageField
            label="Sharing image"
            value={row.ogImage}
            options={ogOptions}
            kind="og"
            target={`seo:${row.path}`}
            hint={
              row.ogImage
                ? "Shown when a link to this page is shared."
                : "Not set — the site-wide image from Settings is used instead. That's usually fine."
            }
            onChanged={onPickImage}
          />
        </div>

        <div className="space-y-5">
          <div>
            <p className="admin-label mb-2">In Google</p>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-[0.75rem] text-zinc-600">
                {HOST}
                {row.path === "/" ? "" : ` › ${row.path.slice(1)}`}
              </p>
              <p className="mt-0.5 truncate text-[1.05rem] leading-snug text-[#1a0dab]">
                {fullTitle || "Untitled"}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.82rem] leading-snug text-zinc-600">
                {desc || "No description yet."}
              </p>
            </div>
          </div>

          <div>
            <p className="admin-label mb-2">Shared as a link</p>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <div className="relative flex h-28 items-center justify-center bg-zinc-900">
                {shareImage ? (
                  <Image src={shareImage} alt="" fill sizes="20rem" className="object-cover" />
                ) : (
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500">
                    {siteName}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-[0.7rem] uppercase text-zinc-400">{HOST}</p>
                <p className="truncate text-[0.875rem] text-zinc-900">{fullTitle || "Untitled"}</p>
                <p className="line-clamp-2 text-[0.75rem] text-zinc-600">{desc}</p>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/** Length as a bar rather than a number, so "too long" needs no arithmetic. */
function Meter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1 w-16 overflow-hidden rounded-full bg-zinc-200">
        <span
          className={cn("block h-full rounded-full transition-all", over ? "bg-amber-500" : "bg-zinc-500")}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </span>
      <span
        className={cn(
          "font-mono text-[0.6875rem] tabular-nums",
          over ? "text-amber-600" : "text-zinc-400",
        )}
      >
        {value}/{max}
      </span>
    </span>
  );
}
