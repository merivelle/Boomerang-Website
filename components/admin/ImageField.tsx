"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Images, Loader2, Upload } from "lucide-react";
import { Button, Dialog, EmptyState, cn, useToast } from "./ui";

export type PickableImage = {
  id: string;
  url: string;
  alt: string | null;
  width: number;
  height: number;
};

/**
 * Choose an image, either by uploading one or by reaching for one already in
 * the library. Both routes matter: uploading is what someone does the first
 * time, and picking is what stops the same sharing image being uploaded nine
 * times under nine different names.
 */
export function ImageField({
  value,
  options,
  kind,
  target,
  label,
  hint,
  aspect = "aspect-[1200/630]",
  onChanged,
}: {
  value: string | null;
  options: PickableImage[];
  kind: "og" | "logo" | "still";
  /** Where the chosen image gets attached, e.g. "site" or "seo:/about". */
  target: string;
  label: string;
  hint?: React.ReactNode;
  aspect?: string;
  onChanged: (mediaId: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [browsing, setBrowsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    body.append("target", target);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That didn't upload. Try again.");
        return;
      }
      toast.success("Image added. Publish when you're ready.");
      router.refresh();
    } catch {
      setError("The upload didn't finish. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="admin-label mb-2">{label}</p>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "admin-checker relative w-40 shrink-0 overflow-hidden rounded-lg border border-zinc-200",
            aspect,
          )}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="160px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center">
              <ImageUp className="h-5 w-5 text-zinc-300" />
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {!uploading && <Upload className="h-3.5 w-3.5" />}
              Upload
            </Button>
            <Button type="button" size="sm" onClick={() => setBrowsing(true)}>
              <Images className="h-3.5 w-3.5" />
              Choose from photos
            </Button>
          </div>

          {hint && <p className="admin-hint">{hint}</p>}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[0.8125rem] text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>

      <Dialog
        open={browsing}
        onClose={() => setBrowsing(false)}
        title="Choose a photo"
        description="Images already in your photo library."
        size="lg"
      >
        {options.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Nothing to choose from yet"
            description="Upload an image and it will be available here next time."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChanged(o.id);
                    setBrowsing(false);
                  }}
                  className="w-full overflow-hidden rounded-lg border border-zinc-200 text-left transition-all hover:border-zinc-900 hover:shadow-md"
                >
                  <div className="admin-checker relative aspect-[1200/630] w-full">
                    <Image src={o.url} alt="" fill sizes="14rem" className="object-cover" />
                  </div>
                  <p className="truncate px-2.5 py-2 text-[0.75rem] text-zinc-600">
                    {o.alt || `${o.width}×${o.height}`}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
