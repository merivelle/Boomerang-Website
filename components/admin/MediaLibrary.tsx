"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ImageOff,
  ImagePlus,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { deleteMedia, setMediaAlt } from "@/app/(admin)/admin/(app)/media/actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  FilterTabs,
  PageTitle,
  cn,
  useToast,
} from "./ui";

export type MediaItem = {
  id: string;
  kind: "still" | "placeholder" | "logo" | "clip" | "hero" | "og";
  url: string;
  builtIn: boolean;
  width: number;
  height: number;
  bytes: number;
  mime: string;
  alt: string | null;
  addedAt: string;
  usedBy: Array<{ label: string; where: string; href: string | null; staged: boolean }>;
};

// Named for what an editor calls them, not for the database's `kind`.
const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "still", label: "Posters" },
  { id: "logo", label: "Client logos" },
  { id: "og", label: "Sharing images" },
  { id: "unused", label: "Not used anywhere" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

const KIND_LABEL: Record<MediaItem["kind"], string> = {
  still: "Poster",
  placeholder: "Stand-in",
  logo: "Client logo",
  clip: "Hover clip",
  hero: "Homepage lettering",
  og: "Sharing image",
};

export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((m) => {
      if (filter === "unused" && m.usedBy.length) return false;
      if (filter !== "all" && filter !== "unused" && m.kind !== filter) return false;
      if (needle) {
        const hay = `${m.alt ?? ""} ${m.usedBy.map((u) => u.label).join(" ")} ${KIND_LABEL[m.kind]}`;
        if (!hay.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [items, filter, q]);

  const counts = useMemo(
    () => ({
      unused: items.filter((m) => !m.usedBy.length).length,
      noAlt: items.filter((m) => !m.alt).length,
    }),
    [items],
  );

  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    setUploading(true);

    let added = 0;
    for (const file of list) {
      const body = new FormData();
      body.append("file", file);
      // Kind is inferred from the file: a transparent PNG or an SVG is
      // essentially always a client logo here, and anything else is a still.
      body.append(
        "kind",
        file.type === "image/svg+xml" || file.type === "image/png" ? "logo" : "still",
      );

      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) {
          toast.error(`${file.name}: ${json.error ?? "didn't upload."}`);
          continue;
        }
        added++;
      } catch {
        toast.error(`${file.name} didn't finish uploading.`);
      }
    }

    setUploading(false);
    if (added) {
      toast.success(added === 1 ? "1 photo added." : `${added} photos added.`);
      router.refresh();
    }
  }

  return (
    <>
      <PageTitle
        title="Photos"
        description="Every image on the website. Adding, describing and deleting photos happens straight away — it's only where they're used that waits to be published."
        action={
          <Button variant="primary" loading={uploading} onClick={() => fileRef.current?.click()}>
            {!uploading && <Upload className="h-4 w-4" />}
            Upload
          </Button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/tiff,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <FilterTabs
          tabs={FILTERS.map((f) => ({
            ...f,
            count: f.id === "unused" ? counts.unused : undefined,
          }))}
          value={filter}
          onChange={setFilter}
          className="flex-1"
        />
        <div className="relative w-full sm:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search photos"
            aria-label="Search photos"
            className="admin-input pl-9"
          />
        </div>
      </div>

      {counts.noAlt > 0 && (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-amber-900">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {counts.noAlt} {counts.noAlt === 1 ? "photo has" : "photos have"} no description. A
            description is what a blind visitor hears and what Google reads — click any photo to add
            one.
          </span>
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files) void upload(e.dataTransfer.files);
        }}
        className={cn(
          "mt-5 rounded-xl transition-colors",
          over && "bg-zinc-100 outline-dashed outline-2 outline-offset-4 outline-zinc-400",
        )}
      >
        {shown.length === 0 ? (
          <EmptyState
            icon={ImagePlus}
            title={items.length ? "No photos match" : "No photos yet"}
            description={
              items.length
                ? "Try a different search, or choose a different filter."
                : "Drag images here, or press Upload. Posters need a wide landscape frame; client logos are best as a white PNG or SVG on a transparent background."
            }
            action={
              <Button variant="primary" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setOpen(m)}
                  className="group w-full overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div
                    className={cn(
                      "relative aspect-video w-full",
                      m.kind === "logo" ? "admin-logo-chip p-5" : "bg-zinc-100",
                    )}
                  >
                    {m.url ? (
                      <Image
                        src={m.url}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 16rem, 45vw"
                        className={cn(m.kind === "logo" ? "object-contain p-5" : "object-cover")}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <ImageOff className="h-5 w-5 text-zinc-300" />
                      </span>
                    )}

                    {!m.usedBy.length && (
                      <span className="absolute right-2 top-2">
                        <Badge tone="neutral">Not used</Badge>
                      </span>
                    )}
                  </div>

                  <div className="px-3 py-2.5">
                    <p className="truncate text-[0.8125rem] font-medium text-zinc-900">
                      {m.alt || m.usedBy[0]?.label || KIND_LABEL[m.kind]}
                    </p>
                    <p className="truncate text-[0.75rem] text-zinc-500">
                      {m.width}×{m.height} · {size(m.bytes)}
                      {!m.alt && <span className="ml-1.5 text-amber-600">No description</span>}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <MediaDetail
          item={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function MediaDetail({
  item,
  onClose,
  onChanged,
}: {
  item: MediaItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [alt, setAlt] = useState(item.alt ?? "");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const used = item.usedBy.length > 0;

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={item.alt || KIND_LABEL[item.kind]}
        description={`${item.width}×${item.height} · ${size(item.bytes)} · added ${date(item.addedAt)}`}
        size="lg"
        footer={
          <>
            <Button
              variant="danger"
              disabled={used || item.builtIn}
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button onClick={onClose}>Close</Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={alt.trim() === (item.alt ?? "")}
              onClick={() =>
                start(async () => {
                  const res = await setMediaAlt(item.id, alt);
                  if (res.ok) {
                    toast.success("Description saved.");
                    onChanged();
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            >
              Save description
            </Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div
            className={cn(
              "relative aspect-video w-full overflow-hidden rounded-lg",
              item.kind === "logo" ? "admin-logo-chip" : "admin-checker",
            )}
          >
            {item.url && (
              <Image
                src={item.url}
                alt={item.alt ?? ""}
                fill
                sizes="24rem"
                className={item.kind === "logo" ? "object-contain p-6" : "object-contain"}
              />
            )}
          </div>

          <div className="space-y-5">
            <Field
              label="Description"
              hint="What the image shows, in a few words. Read aloud to blind visitors, and used by Google. “The Revenant — Leonardo DiCaprio in the snow” beats “image1.jpg”."
            >
              {({ id }) => (
                <textarea
                  id={id}
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  rows={3}
                  placeholder="Describe what's in the picture"
                  className="admin-input"
                />
              )}
            </Field>

            <div>
              <p className="admin-label mb-2">Used on the website</p>
              {used ? (
                <ul className="space-y-1.5">
                  {item.usedBy.map((u, i) => (
                    <li key={i} className="text-[0.875rem]">
                      {u.href ? (
                        <Link
                          href={u.href}
                          className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                        >
                          {u.label}
                        </Link>
                      ) : (
                        <span className="text-zinc-900">{u.label}</span>
                      )}
                      <span className="text-zinc-500"> — {u.where.toLowerCase()}</span>
                      {u.staged && (
                        <Badge tone="draft" className="ml-1.5">
                          Unpublished
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-hint">
                  Nothing on the website uses this image, so deleting it is safe.
                </p>
              )}
            </div>

            {(used || item.builtIn) && (
              <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-zinc-600">
                {item.builtIn
                  ? "This image ships with the website itself rather than living in the photo library, so it can't be deleted here."
                  : "This can't be deleted while it's still in use. Replace it wherever it's used first, then come back."}
              </p>
            )}
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        busy={pending}
        title="Delete this photo?"
        confirmLabel="Delete it"
        body="The file is removed for good. Nothing on the website uses it, so nothing will change — but this can't be undone."
        onConfirm={() =>
          start(async () => {
            const res = await deleteMedia(item.id);
            setConfirming(false);
            if (res.ok) {
              toast.success("Photo deleted.");
              onChanged();
            } else {
              toast.error(res.error);
            }
          })
        }
      />
    </>
  );
}

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
