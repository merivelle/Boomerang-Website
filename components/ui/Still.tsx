import Image from "next/image";

// A single film frame. Desaturated at rest, full colour on hover — the grid is
// a picture frame, the stills are the only colour on the site.
//
// The yoyo pan is a CSS animation (`alternate`), so it runs off the main thread
// and survives page-load jank, unlike a Framer Motion transform.
export function Still({
  slug,
  title,
  priority,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  yoyo = false,
  className = "",
  quality,
}: {
  slug: string;
  title: string;
  priority?: boolean;
  sizes?: string;
  yoyo?: boolean;
  className?: string;
  /** Delivered compression quality. Defaults to 75; the hero uses 90. */
  quality?: number;
}) {
  return (
    <Image
      src={`/assets/stills/${slug}.jpg`}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      className={`object-cover ${yoyo ? "yoyo" : ""} ${className}`}
    />
  );
}
