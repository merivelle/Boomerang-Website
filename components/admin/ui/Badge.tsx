import { cn } from "./cn";

export type Tone = "neutral" | "live" | "warning" | "danger" | "info" | "draft";

const TONE: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
  live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/25",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  draft: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-medium ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A count that reads as a count. Hidden entirely at zero. */
export function CountBadge({ value, tone = "info" }: { value: number; tone?: Tone }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5",
        "text-[0.6875rem] font-semibold tabular-nums ring-1 ring-inset",
        TONE[tone],
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}
