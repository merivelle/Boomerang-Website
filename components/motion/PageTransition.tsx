"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// A brief cut between routes, like a trailer edit.
//
// The first paint is NEVER gated on a transition. `initial={{ opacity: 0 }}`
// would serialise opacity:0 into the SSR markup — and transitions are paused on
// background tabs and in headless renderers, so the fade would never fire and
// the page would ship blank. Only route *changes* animate.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const firstRender = useRef(true);

  useEffect(() => {
    firstRender.current = false;
  }, []);

  if (reduced) return <main>{children}</main>;

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={pathname}
        initial={firstRender.current ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.38, 0.005, 0.215, 1] }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
