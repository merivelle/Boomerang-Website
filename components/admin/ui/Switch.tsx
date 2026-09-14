"use client";

import { useId, useState } from "react";
import { cn } from "./cn";

/**
 * A real switch, not a checkbox with a label. Placement controls read as
 * "this is on / this is off" at a glance, which a 16px tick box does not.
 *
 * It still renders a hidden checkbox so it posts inside a plain <form> exactly
 * like the checkboxes it replaces — `name` + "on" when checked.
 */
export function Switch({
  name,
  label,
  hint,
  defaultChecked = false,
  checked: controlled,
  onCheckedChange,
  disabled,
  disabledReason,
}: {
  name?: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  /** Shown instead of `hint` when disabled — say why, never just grey it out. */
  disabledReason?: React.ReactNode;
}) {
  const id = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const on = controlled ?? uncontrolled;

  function toggle() {
    if (disabled) return;
    const next = !on;
    if (controlled === undefined) setUncontrolled(next);
    onCheckedChange?.(next);
  }

  return (
    <div className={cn("flex items-start gap-3", disabled && "opacity-60")}>
      {name && <input type="hidden" name={name} value={on ? "on" : ""} />}

      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={on}
        aria-describedby={`${id}-hint`}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "mt-0.5 inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-0.5",
          "transition-colors duration-150 disabled:cursor-not-allowed",
          on ? "bg-zinc-900" : "bg-zinc-300 hover:bg-zinc-400",
        )}
      >
        <span
          className={cn(
            "h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-150",
            on ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>

      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cn(
            "block text-[0.875rem] font-medium text-zinc-900",
            !disabled && "cursor-pointer",
          )}
        >
          {label}
        </label>
        {(disabled && disabledReason ? disabledReason : hint) && (
          <p id={`${id}-hint`} className="admin-hint mt-0.5">
            {disabled && disabledReason ? disabledReason : hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** Kept for genuine multi-select lists, where a switch would be wrong. */
export function Checkbox({
  name,
  value,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  value?: string;
  label: React.ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2",
        "text-[0.875rem] text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50",
        "has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-0 focus:ring-offset-0"
      />
      {label}
    </label>
  );
}
