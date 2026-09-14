"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

/**
 * The one button. Before this existed the primary button's Tailwind string was
 * copy-pasted into ten files, so "primary" meant something slightly different
 * on every screen.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-950 disabled:hover:bg-zinc-900",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  quiet: "text-zinc-500 hover:text-zinc-900 underline underline-offset-2 decoration-zinc-300",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-2.5 text-[0.8125rem]",
  md: "h-10 gap-2 rounded-lg px-4 text-[0.875rem]",
  lg: "h-11 gap-2 rounded-lg px-5 text-[0.9375rem]",
};

const BASE =
  "inline-flex select-none items-center justify-center whitespace-nowrap font-medium " +
  "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

type Common = {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks the click without collapsing the layout. */
  loading?: boolean;
  full?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ButtonProps = Common &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;
type LinkProps = Common &
  Omit<React.ComponentProps<typeof Link>, "className" | "children">;

function classes({ variant = "secondary", size = "md", full, className }: Common) {
  return cn(BASE, VARIANT[variant], SIZE[size], full && "w-full", className);
}

export function Button({ loading, disabled, children, ...rest }: ButtonProps) {
  const { variant, size, full, className, ...attrs } = rest;
  return (
    <button
      {...attrs}
      disabled={disabled || loading}
      className={classes({ variant, size, full, className })}
    >
      {loading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Same surface, for navigation. Keeps a link a link. */
export function ButtonLink({ children, ...rest }: LinkProps) {
  const { variant, size, full, className, ...attrs } = rest;
  return (
    <Link {...attrs} className={classes({ variant, size, full, className })}>
      {children}
    </Link>
  );
}

/** An external link that looks like a button. */
export function ButtonAnchor({
  children,
  ...rest
}: Common & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">) {
  const { variant, size, full, className, ...attrs } = rest;
  return (
    <a {...attrs} className={classes({ variant, size, full, className })}>
      {children}
    </a>
  );
}

/**
 * A square button holding only an icon. `label` is required because an icon
 * with no accessible name is invisible to a screen reader and to a tooltip.
 */
export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  className,
  children,
  ...rest
}: Omit<ButtonProps, "children" | "full"> & { label: string; children: React.ReactNode }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANT[variant],
        size === "sm" ? "h-8 w-8 rounded-md" : "h-10 w-10 rounded-lg",
        className,
      )}
    >
      {children}
    </button>
  );
}
