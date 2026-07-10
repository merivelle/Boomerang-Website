// No eyebrow. A tiny tracked uppercase label above every section is the single
// most common generated tell; the title carries itself.
export function PageHeader({ title, note }: { title: string; note?: string }) {
  return (
    <header className="mb-12 md:mb-16">
      <h1 className="max-w-[14ch] text-display uppercase text-text">{title}</h1>
      {note && (
        <p className="mt-8 max-w-[50ch] text-sm leading-relaxed text-muted">{note}</p>
      )}
    </header>
  );
}
