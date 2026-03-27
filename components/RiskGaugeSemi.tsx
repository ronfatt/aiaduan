"use client";

export function RiskGaugeSemi({
  score,
  animate = true,
  large = false,
  label = "RISK MODEL OUTPUT",
}: {
  score: number;
  animate?: boolean;
  large?: boolean;
  label?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const deg = (value / 100) * 180;
  const color = value > 80 ? "#FF4D4F" : value > 55 ? "#FFC53D" : "#52C41A";

  return (
    <div className={`risk-gauge-wrap ${large ? "risk-gauge-wrap-lg" : ""}`}>
      <div className="risk-gauge-track" />
      <div
        className="risk-gauge-fill"
        style={{
          background: `conic-gradient(from 180deg, ${color} ${deg}deg, #334155 ${deg}deg 180deg, transparent 180deg)`,
          boxShadow: `0 0 18px ${color}66`,
          animation: animate ? undefined : "none",
        }}
      />
      <div className="risk-gauge-core">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="text-4xl font-black text-slate-100 drop-shadow-[0_0_14px_rgba(0,194,255,0.45)]">{value}</p>
      </div>
    </div>
  );
}
