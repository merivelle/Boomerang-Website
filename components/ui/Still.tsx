import Image from "next/image";

// A single film frame. Desaturated at rest, full colour on hover — the grid is
// a picture frame, the stills are the only colour on the site.
//
// The yoyo pan is a CSS animation (`alternate`), so it runs off the main thread
// and survives page-load jank, unlike a Framer Motion transform.
export function Still({
  slug,
  src,
  title,
  priority,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  yoyo = false,
  className = "",
  quality,
  focal,
}: {
  slug: string;
  /**
   * Resolved image URL. Falls back to the slug convention so the markup is
   * unchanged for the assets already in /public; uploads pass a real URL.
   */
  src?: string;
  title: string;
  priority?: boolean;
  sizes?: string;
  yoyo?: boolean;
  className?: string;
  /** Delivered compression quality. Defaults to 75; the hero uses 90. */
  quality?: number;
  /**
   * Where the subject sits, 0–1. Only set when an editor has chosen it: the
   * 110 assets migrated from /public have no focal point, and each caller keeps
   * the framing it already had rather than being re-cropped to a default.
   */
  focal?: { x: number; y: number } | null;
}) {
  return (
    <Image
      src={src ?? `/assets/stills/${slug}.jpg`}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      style={focal ? { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` } : undefined}
      className={`object-cover ${yoyo ? "yoyo" : ""} ${className}`}
    />
  );
}
