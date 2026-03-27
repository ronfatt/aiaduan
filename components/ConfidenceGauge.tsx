"use client";

export function ConfidenceGauge({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const gradient = `conic-gradient(#1d4ed8 ${pct * 3.6}deg, #cbd5e1 0deg)`;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-16 w-16 rounded-full"
        style={{ background: gradient }}
        aria-label={`confidence ${pct}%`}
      >
        <div className="absolute inset-2 grid place-items-center rounded-full bg-white text-sm font-black text-slate-900">
          {pct}%
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">AI Confidence</p>
        <p className="text-sm font-semibold text-slate-700">{label ?? "Model certainty score"}</p>
      </div>
    </div>
  );
}
