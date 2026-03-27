"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { useI18n } from "@/lib/i18n";

export function LiveActivityPanel() {
  const { t } = useI18n();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveIdx((prev) => (prev + 1) % 4), 2000);
    return () => clearInterval(timer);
  }, []);

  const activities = [t("live_new"), t("live_risk"), t("live_cluster"), t("live_sla")];

  return (
    <div className="panel panel-ai backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">{t("live_panel_title")}</p>
        <p className="text-[11px] font-semibold text-cyan-100">{t("live_model_confidence")}: 86%</p>
      </div>
      <div className="mt-2 scan-line" />
      <ul className="mt-3 grid gap-2 text-sm text-blue-100">
        {activities.map((item, idx) => (
          <li key={item} className={`live-activity-item ${activeIdx === idx ? "is-active" : ""}`}>
            <span className="status-dot" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-cyan-300/20 bg-white/5 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-300">{t("live_cases")}</p>
          <p className="text-lg font-black text-cyan-200"><CountUp target={36} /></p>
        </div>
        <div className="rounded border border-cyan-300/20 bg-white/5 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-300">{t("live_alerts")}</p>
          <p className="text-lg font-black text-amber-300"><CountUp target={9} /></p>
        </div>
        <div className="rounded border border-cyan-300/20 bg-white/5 p-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-300">{t("live_breach")}</p>
          <p className="text-lg font-black text-red-300"><CountUp target={4} /></p>
        </div>
      </div>
    </div>
  );
}
