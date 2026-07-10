"use client";

import { createContext, useContext, useState } from "react";

type SoundState = { enabled: boolean; toggle: () => void };
const SoundCtx = createContext<SoundState>({ enabled: false, toggle: () => {} });

// Hover-to-hear is opt-in. Nothing ever autoplays on load.
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  return (
    <SoundCtx.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </SoundCtx.Provider>
  );
}

export const useSound = () => useContext(SoundCtx);
