import { useId } from "react";
import { cn } from "./cn";

/**
 * Label + control + hint, wired together. The hint is referenced by
 * aria-describedby rather than left as a loose <p>, so a screen reader reads the
 * explanation as part of the field instead of as stray text after it.
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  /** Pass when the control has its own id (e.g. it is rendered elsewhere). */
  htmlFor?: string;
  className?: string;
  children: React.ReactNode | ((ids: { id: string; describedBy?: string }) => React.ReactNode);
}) {
  const auto = useId();
  const id = htmlFor ?? auto;
  const hintId = hint || error ? `${id}-hint` : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="admin-label mb-2">
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-zinc-400">
            *
          </span>
        )}
      </label>

      {typeof children === "function" ? children({ id, describedBy: hintId }) : children}

      {error ? (
        <p id={hintId} role="alert" className="mt-1.5 text-[0.8125rem] text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="admin-hint mt-1.5">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** A row of fields that collapses to one column on a narrow screen. */
export function FieldRow({
  cols = "1fr 1fr",
  className,
  children,
}: {
  cols?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("grid gap-5 sm:[grid-template-columns:var(--cols)]", className)}
      style={{ ["--cols" as string]: cols }}
    >
      {children}
    </div>
  );
}
