"use client";

import { cn } from "./cn";

export type Tab<T extends string> = {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** A dot on the tab, for "something in here needs attention". */
  flag?: boolean;
  count?: number;
};

/** Segmented tabs. Used for the project editor and the inbox filters. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ReadonlyArray<Tab<T>>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100/70 p-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2",
              "text-[0.875rem] font-medium transition-colors duration-150",
              active
                ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                : "text-zinc-600 hover:text-zinc-900",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span className="rounded-full bg-zinc-200 px-1.5 text-[0.6875rem] tabular-nums text-zinc-600">
                {t.count}
              </span>
            )}
            {t.flag && (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined tabs, for filtering a list rather than switching a form. */
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ReadonlyArray<Tab<T>>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-6 border-b border-zinc-200", className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-2.5 pt-1",
              "text-[0.875rem] font-medium transition-colors duration-150",
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
            )}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[0.6875rem] tabular-nums",
                  active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
