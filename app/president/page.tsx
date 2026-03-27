"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import { getAdminAiAction, getResourceAllocationPlan } from "@/lib/aiIntel";
import { useStore } from "@/lib/store";
import { datelineCountdown, isPastDateline } from "@/lib/utils";

export default function PresidentQueuePage() {
  const { complaints } = useStore();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const enriched = useMemo(
    () =>
      complaints.map((item) => ({
        item,
        ai: getAdminAiAction(item),
        overdue: item.status !== "DONE" && isPastDateline(item),
      })),
    [complaints],
  );

  const activeCount = enriched.filter((row) => row.item.status !== "DONE").length;
  const overdueCount = enriched.filter((row) => row.overdue).length;
  const highRiskCount = enriched.filter((row) => row.item.status !== "DONE" && row.ai.riskScore >= 80).length;
  const topHighRisk = [...enriched]
    .filter((row) => row.item.status !== "DONE")
    .sort((a, b) => b.ai.riskScore - a.ai.riskScore)
    .slice(0, 5);

  const zonePressure = useMemo(() => {
    const zoneMap = enriched
      .filter((row) => row.item.status !== "DONE")
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.item.zone] = (acc[row.item.zone] || 0) + 1;
        return acc;
      }, {});
    return Object.entries(zoneMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [enriched]);
  const allocationPlan = useMemo(() => getResourceAllocationPlan(complaints), [complaints]);

  const tekananOperasi = Math.min(100, Math.round((activeCount / Math.max(1, complaints.length)) * 100 + overdueCount * 6));
  const risikoKeselamatan = Math.min(100, Math.round(highRiskCount * 18 + overdueCount * 6));
  const prestasiSla = Math.max(0, 100 - Math.round((overdueCount / Math.max(1, activeCount)) * 100));
  const intelligenceIndex = Math.max(0, Math.min(100, Math.round((100 - tekananOperasi + (100 - risikoKeselamatan) + prestasiSla) / 3)));
  const indexColor =
    intelligenceIndex >= 75 ? "#52C41A" : intelligenceIndex >= 50 ? "#FFC53D" : "#FF4D4F";

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />
      <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <div className="panel border-amber-200 bg-amber-50/80 lg:col-span-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-800">President Dashboard</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">主席决策台</h1>
          <p className="mt-2 text-sm text-slate-700">
            这里不是看单个工单，而是看整座城市的风险、部门压力和 AI 给出的决策建议。重点是快速判断哪里需要介入。
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">AI City Risk Index</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">AI Resource Allocation</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">AI Weekly Brief</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">AI Broadcast Recommendation</div>
          </div>
        </div>

        <div className="panel panel-ai">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Presiden View</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">City Intelligence Index</h2>

          <div className="mt-4 flex justify-center">
            <div
              className="city-index-ring"
              style={{ background: `conic-gradient(${indexColor} ${intelligenceIndex * 3.6}deg, rgba(100,116,139,0.35) 0deg)` }}
            >
              <div className="city-index-core">
                <p className="text-4xl font-black text-white">{intelligenceIndex}</p>
                <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">Index / 100</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-white/10 p-3">
              <p className="text-sm font-semibold text-cyan-100">Tekanan Operasi</p>
              <p className="mt-1 text-3xl font-extrabold text-white">{tekananOperasi}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3">
              <p className="text-sm font-semibold text-cyan-100">Risiko Keselamatan</p>
              <p className="mt-1 text-3xl font-extrabold text-white">{risikoKeselamatan}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3">
              <p className="text-sm font-semibold text-cyan-100">Prestasi SLA</p>
              <p className="mt-1 text-3xl font-extrabold text-white">{prestasiSla}%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">AI Resource Allocation</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-900">{allocationPlan.primaryDepartment}</h3>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Overload Score</p>
                <p className="text-3xl font-black text-amber-700">{allocationPlan.overloadScore}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">{allocationPlan.recommendation}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Priority Cases</p>
                <p className="mt-1 text-3xl font-black text-red-700">{allocationPlan.priorityCases}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Delay Routine Tasks</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{allocationPlan.deferredTasks}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Suggested Action</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">Supervisor intervention</p>
              </article>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              {allocationPlan.interventionPlan.map((item) => (
                <p key={item} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-slate-700">{item}</p>
              ))}
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <h3 className="text-xl font-extrabold text-slate-900">Top 5 Risiko Tinggi</h3>
            <table className="mt-3 min-w-full text-left text-sm">
              <thead>
                <tr className="admin-head border-b border-slate-300">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Zon</th>
                  <th className="py-2 pr-3">Risiko</th>
                  <th className="py-2 pr-3">Urgency</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">SLA</th>
                </tr>
              </thead>
              <tbody>
                {topHighRisk.map(({ item, ai, overdue }) => (
                  <tr key={item.id} className={overdue || ai.riskScore >= 80 ? "high-risk-row border-b border-slate-200" : "border-b border-slate-200"}>
                    <td className="py-2 pr-3 font-bold text-blue-900">{item.id}</td>
                    <td className="py-2 pr-3">{item.zone}</td>
                    <td className="py-2 pr-3"><span className="risk-score-chip">{ai.riskScore}</span></td>
                    <td className="py-2 pr-3"><UrgencyBadge urgency={item.aiUrgency} /></td>
                    <td className="py-2 pr-3"><StatusBadge status={item.status} /></td>
                    <td className={`py-2 pr-3 font-semibold ${overdue ? "text-red-700" : "text-slate-700"}`}>{datelineCountdown(item, nowMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3 className="text-xl font-extrabold text-slate-900">3 Kawasan Tekanan</h3>
            <div className="mt-3 grid gap-3">
              {zonePressure.length ? (
                zonePressure.map(([zone, count], idx) => (
                  <div key={zone} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">#{idx + 1} {zone}</p>
                    <p className="text-3xl font-extrabold text-slate-900">{count}</p>
                    <p className="text-sm font-semibold text-slate-600">Aduan aktif</p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-emerald-700">Tiada tekanan operasi aktif.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
