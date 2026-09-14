"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, ImageUp, Loader2, Upload } from "lucide-react";
import { setFocalPoint } from "@/app/(admin)/admin/(app)/work/actions";
import { Card, CardBody, CardHeader, Button, cn, useToast } from "./ui";

type Props = {
  slug: string | null;
  poster: string | null;
  hasRealPoster: boolean;
  focal: { x: number; y: number } | null;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/tiff";

export function PosterUploader({ slug, poster, hasRealPoster, focal }: Props) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState(focal);
  const [pendingFocal, startFocal] = useTransition();

  async function upload(file: File) {
    if (!slug) {
      setError("Save the credit first, then add its poster.");
      return;
    }
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);
    body.append("kind", "still");
    body.append("target", `project:${slug}`);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That didn't upload. Try again.");
        return;
      }
      toast.success(
        `Poster added — ${json.width}×${json.height}, ${(json.bytes / 1024).toFixed(0)} KB. ` +
          "Publish when you're ready.",
      );
      setPoint(null);
      router.refresh();
    } catch {
      setError("The upload didn't finish. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // Click the preview to say what must stay in frame. This is what actually
  // fixes a bad crop; validation can only reject the extreme cases.
  function pick(e: React.MouseEvent<HTMLDivElement>) {
    if (!hasRealPoster || !slug || busy) return;
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
    setPoint({ x, y });
    startFocal(async () => {
      await setFocalPoint(slug, x, y);
      router.refresh();
    });
  }

  return (
    <Card className="self-start">
      <CardHeader
        title="Poster"
        description="The wide frame used everywhere this film appears."
        action={
          pendingFocal ? (
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          ) : null
        }
      />

      <CardBody className="space-y-3">
        <div
          ref={frameRef}
          onClick={pick}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void upload(f);
          }}
          className={cn(
            "relative aspect-video w-full overflow-hidden rounded-lg border-2 border-dashed bg-zinc-100 transition-colors",
            over ? "border-zinc-900 bg-zinc-200" : poster ? "border-transparent" : "border-zinc-300",
            hasRealPoster && slug && !busy ? "cursor-crosshair" : "",
          )}
          title={hasRealPoster ? "Click the part that must stay in frame" : undefined}
        >
          {poster ? (
            <Image
              key={poster}
              src={poster}
              alt=""
              fill
              sizes="352px"
              style={point ? { objectPosition: `${point.x * 100}% ${point.y * 100}%` } : undefined}
              className={cn("object-cover", hasRealPoster ? "" : "opacity-40")}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <ImageUp className="h-6 w-6 text-zinc-300" />
              <p className="text-[0.875rem] text-zinc-500">Drop an image here</p>
              <p className="admin-hint">or choose a file below</p>
            </div>
          )}

          {point && hasRealPoster && (
            <span
              aria-hidden
              className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            >
              <Crosshair className="h-3.5 w-3.5 text-zinc-900" />
            </span>
          )}

          {over && !busy && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 text-[0.875rem] font-medium text-zinc-900">
              Drop to upload
            </div>
          )}

          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              <span className="text-[0.875rem] text-zinc-700">Uploading and resizing…</span>
            </div>
          )}
        </div>

        {hasRealPoster && !busy && (
          <p className="admin-hint flex items-start gap-2">
            <Crosshair aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
            Click the image to mark what must stay in frame when it&rsquo;s cropped.
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />

        <Button
          type="button"
          full
          loading={busy}
          disabled={!slug}
          onClick={() => inputRef.current?.click()}
        >
          {!busy && <Upload className="h-4 w-4" />}
          {hasRealPoster ? "Replace poster" : "Choose a file"}
        </Button>

        {!slug && (
          <p className="admin-hint">Save the credit first — then you can add its poster.</p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-red-700"
          >
            {error}
          </p>
        )}

        {!hasRealPoster && !busy && slug && (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[0.8125rem] leading-relaxed text-amber-800">
            Without a poster this credit stays hidden from the website, even when it&rsquo;s set to
            show.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
