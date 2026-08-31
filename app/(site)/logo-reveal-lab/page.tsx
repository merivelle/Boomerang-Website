"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// WebGL is client-only — a <Canvas> can't SSR.
const LogoReveal = dynamic(() => import("@/components/home/loader/LogoReveal"), {
  ssr: false,
});

export default function LogoRevealLab() {
  const [key, setKey] = useState(0); // replay
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]">
      <LogoReveal
        key={key}
        onComplete={() => {
          setDone(true);
          // eslint-disable-next-line no-console
          console.log("LogoReveal onComplete fired");
        }}
      />

      {/* dev controls */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-4 p-5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-white/70">
        <button
          onClick={() => {
            setDone(false);
            setKey((k) => k + 1);
          }}
          className="border border-white/30 px-4 py-2 transition-colors hover:border-white hover:text-white"
        >
          Replay
        </button>
        <span className="tabular-nums">
          {done ? "onComplete ✓" : "playing"}
        </span>
      </div>
    </div>
  );
}
