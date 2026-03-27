"use client";

import { useEffect, useState } from "react";

export function CountUp({ target, durationMs = 900, suffix = "" }: { target: number; durationMs?: number; suffix?: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const next = Math.round(from + (target - from) * p);
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return <>{value}{suffix}</>;
}
