"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFocalPoint } from "@/app/(admin)/admin/(app)/work/actions";

type Props = {
  slug: string | null;
  poster: string | null;
  hasRealPoster: boolean;
  focal: { x: number; y: number } | null;
};

export function PosterUploader({ slug, poster, hasRealPoster, focal }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [point, setPoint] = useState(focal);
  const [pendingFocal, startFocal] = useTransition();

  async function upload(file: File) {
    if (!slug) {
      setError("Save the credit first, then add a poster.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);

    const body = new FormData();
    body.append("file", file);
    body.append("slug", slug);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That didn't upload. Try again.");
        return;
      }
      setNote(
        `${json.replaced ? "Poster replaced" : "Poster added"} — ${json.width}×${json.height}, ` +
          `${(json.bytes / 1024).toFixed(0)} KB.`,
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
    if (!hasRealPoster || !slug) return;
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

  const objectPosition = point ? `${point.x * 100}% ${point.y * 100}%` : undefined;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <p className="admin-label">Poster</p>
        {pendingFocal && <span className="text-xs text-zinc-400">Saving…</span>}
      </div>

      <div
        ref={frameRef}
        onClick={pick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        className={`relative mt-3 aspect-video w-full overflow-hidden rounded bg-zinc-100 ${
          hasRealPoster && slug ? "cursor-crosshair" : ""
        }`}
        title={hasRealPoster ? "Click the part that must stay in frame" : undefined}
      >
        {poster ? (
          <Image
            key={poster}
            src={poster}
            alt=""
            fill
            sizes="288px"
            style={objectPosition ? { objectPosition } : undefined}
            className={`object-cover ${hasRealPoster ? "" : "opacity-40"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-zinc-400">
            Drop an image here, or choose one below
          </div>
        )}

        {point && hasRealPoster && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          />
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-zinc-700">
            Uploading…
          </div>
        )}
      </div>

      {hasRealPoster && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Click the image to mark what must stay in frame when it&rsquo;s cropped.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={busy || !slug}
        onClick={() => inputRef.current?.click()}
        className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-400 disabled:opacity-50"
      >
        {hasRealPoster ? "Replace poster" : "Upload poster"}
      </button>

      {!slug && (
        <p className="mt-2 text-xs text-zinc-500">
          Save the credit first — then you can add its poster.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          {error}
        </p>
      )}
      {note && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{note}</p>
      )}

      {!hasRealPoster && !busy && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Without a poster this credit stays hidden from the website.
        </p>
      )}

      <p className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-500">
        Use a wide frame from the trailer, not a tall poster. Big files are fine
        — they&rsquo;re resized automatically.
      </p>
    </div>
  );
}
