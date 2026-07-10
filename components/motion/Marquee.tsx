// Slow ticker of studio names. Authority by association — the client logos are
// the copy. Pure CSS so it stays off the main thread.
export function Marquee({ items }: { items: readonly string[] }) {
  return (
    <div className="group relative flex overflow-hidden" aria-hidden>
      <div className="flex shrink-0 animate-marquee items-center whitespace-nowrap group-hover:[animation-play-state:paused]">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
              {item}
            </span>
            <span className="mx-6 text-line" aria-hidden>
              —
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
