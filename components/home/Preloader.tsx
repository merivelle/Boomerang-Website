"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// WebGL is heavy + client-only — never SSR it.
const LogoReveal = dynamic(() => import("@/components/home/loader/LogoReveal"), {
  ssr: false,
});

type Phase = "pending" | "playing" | "fading" | "done";
const KEY = "boomerang-intro-seen";

// The entrance. A full-screen #0a0a0a overlay covers the whole page while the 3D
// b reveals itself; when the reveal finishes it fades out over 0.4s to hand off
// to the site underneath.
//
// Home only, once per session, and absent entirely under reduced-motion or
// without JS — the site is always the true first paint, so nothing is ever gated
// behind this. Starting at "pending" (null) keeps SSR and the first client render
// in agreement, avoiding a hydration mismatch.
export function Preloader() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("pending");

  useEffect(() => {
    if (pathname !== "/") return setPhase("done");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {
      /* private mode — treat as unseen, still harmless */
    }
    if (reduced || seen) return setPhase("done");
    setPhase("playing");
  }, [pathname]);

  // The reveal finished: remember it for the session, fade out, then unmount.
  const handleComplete = useCallback(() => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("fading");
    const toDone = setTimeout(() => setPhase("done"), 400);
    return () => clearTimeout(toDone);
  }, []);

  if (phase === "pending" || phase === "done") return null;

  const fading = phase === "fading";
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] bg-[#0a0a0a] transition-opacity duration-[400ms] ease-signature ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <LogoReveal onComplete={handleComplete} className="h-full w-full" />
    </div>
  );
}
