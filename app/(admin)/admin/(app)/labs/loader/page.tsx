"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// WebGL is heavy + client-only — never SSR it.
const MetalTornado = dynamic(
  () => import("@/components/home/loader/MetalTornado").then((m) => m.MetalTornado),
  { ssr: false },
);

export default function LoaderLab() {
  const [key, setKey] = useState(0); // replay
  const [scrub, setScrub] = useState<number | undefined>(undefined);

  // ?t=0.5 freezes a frame for verification screenshots
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t !== null) setScrub(Math.min(1, Math.max(0, parseFloat(t))));
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <MetalTornado key={key} scrub={scrub} />

      {/* dev controls */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-4 p-5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-white/70">
        <button
          onClick={() => {
            setScrub(undefined);
            setKey((k) => k + 1);
          }}
          className="border border-white/30 px-4 py-2 transition-colors hover:border-white hover:text-white"
        >
          Replay
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={scrub ?? 0}
          onChange={(e) => setScrub(parseFloat(e.target.value))}
          className="w-64"
        />
        <span className="tabular-nums">
          {scrub === undefined ? "playing" : `t = ${scrub.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
