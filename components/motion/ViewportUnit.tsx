"use client";

import { useEffect } from "react";

// Publishes a real viewport-height unit. `100vh` overshoots on mobile because
// browser chrome is excluded from the calculation but not from the screen.
export function ViewportUnit() {
  useEffect(() => {
    const set = () =>
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    set();
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
    };
  }, []);
  return null;
}
