"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "./cn";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };

type Api = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<Api | null>(null);

/**
 * Feedback used to be an inline coloured <p> written slightly differently on
 * every page. One channel means an editor learns the pattern once: it appears
 * bottom-right, it says what happened, it goes away.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((v) => [...v, { id, kind, message }]);
    // Errors stay longer: they usually ask the reader to do something.
    setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), kind === "error" ? 7000 : 4000);
  }, []);

  const api = useMemo<Api>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Viewport items={items} dismiss={(id) => setItems((v) => v.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast(): Api {
  const ctx = useContext(ToastContext);
  // A no-op fallback rather than a throw: a missing provider should never be
  // the reason a save appears to fail.
  return ctx ?? { success: () => {}, error: () => {}, info: () => {} };
}

const ICON: Record<Kind, typeof Check> = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

const STYLE: Record<Kind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-zinc-200 bg-white text-zinc-900",
};

function Viewport({ items, dismiss }: { items: Toast[]; dismiss: (id: number) => void }) {
  // A `typeof document` check is not enough: the server renders nothing and the
  // client's FIRST render would produce a portal, which is a hydration
  // mismatch. Both passes have to agree on null, so the portal only appears
  // after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="admin-root pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {items.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg",
              "animate-[fadein_180ms_ease-out]",
              STYLE[t.kind],
            )}
          >
            <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 text-[0.875rem] leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-0.5 rounded p-1 opacity-50 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
