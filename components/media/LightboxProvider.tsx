"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Project } from "@/content/projects";
import { Lightbox } from "./Lightbox";

type LightboxCtx = { open: (project: Project) => void; close: () => void };

const Ctx = createContext<LightboxCtx | null>(null);

// Wrap any subtree whose film stills should open the lightbox. One dialog is
// rendered (via portal); every still just calls `open(project)`.
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const open = useCallback((p: Project) => setProject(p), []);
  const close = useCallback(() => setProject(null), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Lightbox project={project} onClose={close} />
    </Ctx.Provider>
  );
}

export function useLightbox(): LightboxCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLightbox must be used within <LightboxProvider>");
  return ctx;
}
