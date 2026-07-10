"use client";

import { useEffect, useState } from "react";

// Coordinates instead of a pitch. A live Los Angeles clock is real data —
// which is the only honest reason to reach for monospace.
export function LocalClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Render nothing until mounted — a server-rendered clock would hydrate wrong.
  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {time ?? "--:--:--"}
    </span>
  );
}
