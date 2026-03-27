"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { CountUp } from "@/components/CountUp";
import { InsightsMap } from "@/components/InsightsMap";
import { useI18n } from "@/lib/i18n";
import { getForecast, getOperationalEfficiency, getPredictiveHotspots, getProactiveAlerts, getProactiveTriggers, getTrendSeries, TrendRange } from "@/lib/aiIntel";
import { useStore } from "@/lib/store";
import { isOverdue, percent } from "@/lib/utils";

const TrendChart = dynamic(
  () => import("@/components/TrendChart").then((mod) => mod.TrendChart),
  { ssr: false },
);

const trendRanges: Array<{ key: TrendRange; label: string }> = [
  { key: "7D", label: "7 Hari" },
  { key: "14D", label: "14 Hari" },
  { key: "1M", label: "1 Bulan" },
  { key: "6M", label: "6 Bulan" },
  { key: "1Y", label: "1 Tahun" },
];

export default function InsightsPage() {
  const { complaints } = useStore();
  const { t } = useI18n();
  const [trendRange, setTrendRange] = useState<TrendRange>("14D");

  const thisMonth = useMemo(() => {
    const now = new Date();
    return complaints.filter((item) => {
      const d = new Date(item.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [complaints]);

  const resolved = thisMonth.filter((item) => item.status === "DONE");

  const avgResolveHours = useMemo(() => {
    const done = complaints.filter((item) => item.status === "DONE" && item.timeline.some((tItem) => tItem.status === "DONE"));
    if (!done.length) return 0;
    const total = done.reduce((sum, item) => {
      const start = new Date(item.createdAt).getTime();
      const end = new Date(item.timeline[item.timeline.length - 1].at).getTime();
      return sum + (end - start) / (3600 * 1000);
    }, 0);
    return Math.round(total / done.length);
  }, [complaints]);

  const overdueCount = complaints.filter((item) => isOverdue(item)).length;

  const trend = useMemo(() => {
    return getTrendSeries(complaints, trendRange);
  }, [complaints, trendRange]);

  const forecast = useMemo(() => getForecast(complaints), [complaints]);
  const predictiveHotspots = useMemo(() => getPredictiveHotspots(complaints), [complaints]);
  const alerts = useMemo(() => getProactiveAlerts(complaints), [complaints]);
  const proactiveTriggers = useMemo(() => getProactiveTriggers(complaints), [complaints]);
  const efficiency = useMemo(() => getOperationalEfficiency(complaints), [complaints]);
  const zoneScorecard = useMemo(() => {
    return Object.entries(
      complaints.reduce<Record<string, { total: number; done: number; overdue: number }>>((acc, item) => {
        if (!acc[item.zone]) acc[item.zone] = { total: 0, done: 0, overdue: 0 };
        acc[item.zone].total += 1;
        if (item.status === "DONE") acc[item.zone].done += 1;
        if (isOverdue(item) && item.status !== "DONE") acc[item.zone].overdue += 1;
        return acc;
      }, {}),
    )
      .map(([zone, row]) => ({
        zone,
        total: row.total,
        resolvedRate: percent(row.done, row.total),
        overdue: row.overdue,
      }))
      .sort((a, b) => b.total - a.total);
  }, [complaints]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />

      <div className="grid gap-4">
        <section className="panel panel-ai insights-command-hero">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-200">Leadership Command Center</p>
              <h1 className="mt-1 text-2xl font-black text-white">Pusat Analitik Bandar</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Halaman ini menyatukan KPI, ramalan AI, trend operasi, dan peta tekanan bandar untuk membantu keputusan kepimpinan dibuat dengan cepat.
              </p>
            </div>
            <div className="insights-hero-status rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-200">AI Monitoring</p>
              <p className="mt-1 text-lg font-black text-white">Aktif</p>
              <p className="mt-1 text-xs text-slate-300">Forecast, hotspot, dan trigger sedang dipantau secara berterusan.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Fokus Minggu Ini</p>
              <p className="mt-1 text-sm font-semibold text-white">{forecast.highRiskZone} menunjukkan tekanan paling tinggi.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Perubahan Dijangka</p>
              <p className="mt-1 text-sm font-semibold text-white">Aduan berkaitan saliran dijangka meningkat +{Math.abs(forecast.predictedChangePct)}%.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Keputusan Disyorkan</p>
              <p className="mt-1 text-sm font-semibold text-white">{forecast.recommendation}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="panel panel-glass">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("insights_total_month")}</p>
            <h3 className="mt-1 text-4xl font-black text-slate-900"><CountUp target={thisMonth.length} /></h3>
          </article>
          <article className="panel panel-glass">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("insights_resolved_rate")}</p>
            <h3 className="mt-1 text-4xl font-black text-emerald-700"><CountUp target={percent(resolved.length, thisMonth.length)} suffix="%" /></h3>
          </article>
          <article className="panel panel-glass">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("insights_avg_resolve")}</p>
            <h3 className="mt-1 text-4xl font-black text-slate-900"><CountUp target={avgResolveHours} suffix="h" /></h3>
          </article>
          <article className="panel panel-glass">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("insights_overdue")}</p>
            <h3 className="mt-1 text-4xl font-black text-red-700"><CountUp target={overdueCount} /></h3>
          </article>
        </section>

        <section className="panel panel-ai insights-forecast-panel">
          <h2 className="text-xl font-extrabold text-cyan-100">{t("insights_forecast_title")}</h2>
          <p className="mt-1 text-xs font-semibold text-blue-200">{t("insights_model_confidence", { pct: Math.round(forecast.modelConfidence * 100) })}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <article className="rounded border border-white/20 bg-white/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">{t("insights_drainage_forecast")}</p>
              <p className="mt-1 text-3xl font-black text-red-300">↑ <CountUp target={Math.abs(forecast.predictedChangePct)} suffix="%" /></p>
            </article>
            <article className="rounded border border-white/20 bg-white/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">{t("insights_high_risk_zone")}</p>
              <p className="mt-1 text-3xl font-black text-amber-300">{forecast.highRiskZone}</p>
            </article>
            <article className="rounded border border-white/20 bg-white/5 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-200">{t("insights_preinspection")}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-100">{t("insights_yes_reco", { recommendation: forecast.recommendation })}</p>
            </article>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {predictiveHotspots.slice(0, 2).map((hotspot) => (
              <article key={hotspot.zone} className="rounded border border-white/20 bg-white/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-200">Predicted Hotspot</p>
                <p className="mt-1 text-2xl font-black text-white">{hotspot.zone}</p>
                <p className="text-sm text-cyan-100">{hotspot.topCategory} risk projected +{hotspot.predictedIncreasePct}% next 7 days</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel panel-glass border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <h2 className="text-xl font-extrabold text-slate-900">{t("insights_efficiency_title")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <article className="rounded border border-indigo-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("insights_triage_reduced")}</p>
              <p className="mt-1 text-2xl font-black text-emerald-700"><CountUp target={efficiency.triageReductionPct} suffix="%" /></p>
            </article>
            <article className="rounded border border-indigo-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("insights_manpower_saving")}</p>
              <p className="mt-1 text-2xl font-black text-slate-900"><CountUp target={efficiency.manpowerSavingPerMonth} /> {t("insights_staff_per_month")}</p>
            </article>
          </div>
        </section>

        <section className="panel panel-glass insights-trend-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {trendRange === "7D"
                  ? "Trend Aduan 7 Hari"
                  : trendRange === "14D"
                    ? "Trend Aduan 14 Hari"
                    : trendRange === "1M"
                      ? "Trend Aduan 1 Bulan"
                      : trendRange === "6M"
                        ? "Trend Aduan 6 Bulan"
                        : "Trend Aduan 1 Tahun"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">Lengkung trend ini digabungkan daripada data semasa dan data simulasi demo untuk paparan penuh.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendRanges.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={trendRange === option.key ? "btn-primary" : "btn-secondary"}
                  onClick={() => setTrendRange(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 h-72 w-full"><TrendChart data={trend} /></div>
        </section>

        <section className="panel panel-glass insights-prediction-panel">
          <h2 className="text-xl font-extrabold text-slate-900">{t("insights_prediction_title")}</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Forecast Summary</p>
              <p className="mt-2 text-lg font-black text-slate-900">
                Sistem mengesan tekanan operasi awal di <span className="text-blue-900">{forecast.highRiskZone}</span> dengan keyakinan model {Math.round(forecast.modelConfidence * 100)}%.
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                {alerts.map((item) => (
                  <p key={item} className="rounded-xl border border-white bg-white px-3 py-2 text-slate-700">{item}</p>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Recommended Intervention</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{forecast.recommendation}</p>
              <div className="mt-4 grid gap-2">
                <div className="rounded-xl border border-white bg-white px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tetingkap Risiko</p>
                  <p className="text-sm font-semibold text-slate-900">7 hari akan datang</p>
                </div>
                <div className="rounded-xl border border-white bg-white px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Zon Keutamaan</p>
                  <p className="text-sm font-semibold text-slate-900">{forecast.highRiskZone}</p>
                </div>
                <div className="rounded-xl border border-white bg-white px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Perubahan Dijangka</p>
                  <p className="text-sm font-semibold text-slate-900">+{Math.abs(forecast.predictedChangePct)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {proactiveTriggers.map((trigger) => (
              <article key={trigger.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">AI Trigger</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900">{trigger.title}</h3>
                  </div>
                  <span
                    className={`badge ${
                      trigger.severity === "HIGH"
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : trigger.severity === "MEDIUM"
                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {trigger.severity}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-slate-700">
                  <p><span className="font-semibold">Zon:</span> {trigger.zone}</p>
                  <p><span className="font-semibold">Tetingkap:</span> {trigger.window}</p>
                  <p><span className="font-semibold">Keyakinan:</span> {trigger.confidence}%</p>
                  <p><span className="font-semibold">Pencetus:</span> {trigger.trigger}</p>
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold">Tindakan:</span> {trigger.recommendation}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel panel-glass">
          <h2 className="text-xl font-extrabold text-slate-900">Ward / Zone Performance Scorecard</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="admin-head border-b border-slate-300">
                  <th className="py-2 pr-3">Zone</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Resolved Rate</th>
                  <th className="py-2 pr-3">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {zoneScorecard.map((row) => (
                  <tr key={row.zone} className="border-b border-slate-200">
                    <td className="py-2 pr-3 font-semibold">{row.zone}</td>
                    <td className="py-2 pr-3">{row.total}</td>
                    <td className="py-2 pr-3">{row.resolvedRate}%</td>
                    <td className={`py-2 pr-3 font-semibold ${row.overdue ? "text-red-700" : "text-emerald-700"}`}>{row.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel panel-glass insights-map-panel">
          <h2 className="text-xl font-extrabold text-slate-900">{t("insights_cluster_map_title")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("insights_cluster_map_desc")}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge border border-red-200 bg-red-50 text-red-700">Current cluster pulse</span>
            <span className="badge border border-violet-200 bg-violet-50 text-violet-700">Predictive next-week risk zone</span>
          </div>
          <div className="map-dark-wrap mt-3"><InsightsMap complaints={complaints} predictiveHotspots={predictiveHotspots} /></div>
        </section>
      </div>
    </div>
  );
}
