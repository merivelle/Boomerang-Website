/** Joins class names, dropping falsey ones. Small enough not to warrant clsx. */
export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
