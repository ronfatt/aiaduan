"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { isOverdue, percent } from "@/lib/utils";

function withinDays(dateString: string, days: number) {
  const diff = Date.now() - new Date(dateString).getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

export default function HomePage() {
  const { complaints } = useStore();
  const { t } = useI18n();
  const [nowMs] = useState(() => Date.now());

  const publicStats = useMemo(() => {
    const total = complaints.length;
    const done = complaints.filter((item) => item.status === "DONE").length;
    const assignedWithin48h = complaints.filter((item) =>
      item.timeline.some((event) => {
        if (event.status !== "ASSIGNED") return false;
        const created = new Date(item.createdAt).getTime();
        const assigned = new Date(event.at).getTime();
        return assigned - created <= 48 * 60 * 60 * 1000;
      }),
    ).length;

    const closed = complaints.filter((item) => item.status === "DONE" && item.timeline.length > 1);
    const avgResponseHours = closed.length
      ? Math.round(
          closed.reduce((sum, item) => {
            const created = new Date(item.createdAt).getTime();
            const firstAction = new Date(item.timeline[1].at).getTime();
            return sum + (firstAction - created) / (60 * 60 * 1000);
          }, 0) / closed.length,
        )
      : 0;

    return {
      total,
      avgResponseHours,
      followUp48hRate: percent(assignedWithin48h, total),
      resolvedRate: percent(done, total),
    };
  }, [complaints]);

  const cityIndex = useMemo(() => {
    const responseScore = Math.max(0, Math.min(100, 100 - publicStats.avgResponseHours * 2));
    const value = Math.round(
      publicStats.resolvedRate * 0.5 + publicStats.followUp48hRate * 0.3 + responseScore * 0.2,
    );
    return { value, status: "Bandar stabil tetapi tekanan operasi meningkat." };
  }, [publicStats]);

  const aiStatus = useMemo(() => {
    const active = complaints.filter((item) => item.status !== "DONE").length;
    const riskAlerts = complaints.filter((item) => item.status !== "DONE" && (item.aiUrgency === "HIGH" || isOverdue(item))).length;
    const slaBreach = complaints.filter((item) => isOverdue(item)).length;
    return {
      modelConfidence: 86,
      active,
      riskAlerts,
      slaBreach,
    };
  }, [complaints]);

  const weeklyUpdates = useMemo(() => {
    const recentDone = complaints.filter((item) => item.status === "DONE" && withinDays(item.createdAt, 7));
    const grouped = recentDone.reduce<Record<string, { count: number; zone: string }>>((acc, item) => {
      if (!acc[item.department]) acc[item.department] = { count: 0, zone: item.zone };
      acc[item.department].count += 1;
      return acc;
    }, {});

    const rows = Object.entries(grouped)
      .map(([department, value]) => ({ department, count: value.count, zone: value.zone }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (!rows.length) {
      return [
        { department: "Road Maintenance Unit", count: 8, zone: "Apas" },
        { department: "Public Lighting Unit", count: 6, zone: "Bandar" },
        { department: "Drainage & Flood Control", count: 5, zone: "Balung" },
      ];
    }

    return rows;
  }, [complaints]);

  const departmentBoard = useMemo(() => {
    return Object.entries(
      complaints
        .filter((item) => item.status === "DONE")
        .reduce<Record<string, number>>((acc, item) => {
          acc[item.department] = (acc[item.department] || 0) + 1;
          return acc;
        }, {}),
    )
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [complaints]);

  const transparency = useMemo(() => {
    const weekMs = 7 * 24 * 3600 * 1000;
    const thisWeek = complaints.filter((item) => nowMs - new Date(item.createdAt).getTime() <= weekMs);
    const prevWeek = complaints.filter((item) => {
      const diff = nowMs - new Date(item.createdAt).getTime();
      return diff > weekMs && diff <= weekMs * 2;
    });
    const thisOverdue = thisWeek.filter((item) => item.status !== "DONE" && isOverdue(item)).length;
    const prevOverdue = prevWeek.filter((item) => item.status !== "DONE" && isOverdue(item)).length;
    const overdueDelta = prevOverdue ? Math.round(((thisOverdue - prevOverdue) / prevOverdue) * 100) : 0;
    return {
      handledThisWeek: thisWeek.filter((item) => item.status === "DONE").length,
      avgResponse: publicStats.avgResponseHours,
      overdueDelta,
    };
  }, [complaints, nowMs, publicStats.avgResponseHours]);

  return (
    <div className="grid gap-4">
      <section className="panel neural-grid overflow-hidden lg:grid lg:grid-cols-2 lg:items-center">
        <div className="relative z-10 text-center sm:text-left">
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-900 sm:hidden">
            Aduan Awam
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-[#0B1F3B] sm:text-4xl">Ada Masalah di Tawau?<br />Kami Bertindak.</h1>
          <p className="mt-3 text-base font-semibold text-[#1d4ed8] sm:text-lg">
            Laporkan dalam 30 saat.
            <br />
            Sistem AI akan terus menilai dan menghantar kepada jabatan berkaitan - tanpa birokrasi yang rumit.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/submit" className="hero-main-cta">HANTAR ADUAN SEKARANG</Link>
            <Link href="/track" className="hero-secondary-cta mobile-track-btn">Semak Status Aduan</Link>
          </div>
          <div className="mt-3 hidden flex-col gap-2 sm:flex-row sm:flex">
            <Link href="/assistant" className="hero-secondary-cta text-center">
              WhatsApp / Voice Bot Demo
            </Link>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">Cepat • Mudah • Telus</p>
          <div className="mt-3 grid gap-2 sm:hidden">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-left shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">3 Langkah Mudah</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Terangkan masalah, pilih lokasi, kemudian hantar.</p>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-xs font-medium text-slate-500">Platform sokongan keputusan bandar berasaskan AI pertama di Tawau.</p>
        </div>

        <aside className="mt-6 hidden lg:block">
          <div className="compact-ai-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">AI Status</p>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="compact-ai-item"><span>Model Confidence</span><span>{aiStatus.modelConfidence}%</span></p>
            <p className="compact-ai-item"><span>Aduan Aktif</span><span>{aiStatus.active}</span></p>
            <p className="compact-ai-item"><span>Amaran Risiko</span><span>{aiStatus.riskAlerts}</span></p>
            <p className="compact-ai-item"><span>Pelanggaran SLA</span><span>{aiStatus.slaBreach}</span></p>
          </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Akses Pantas</p>
          <div className="mt-3 grid gap-3">
            <Link
              href="/submit"
              className="rounded-[20px] bg-gradient-to-b from-blue-600 to-blue-800 px-4 py-5 text-center text-lg font-extrabold text-white shadow-lg"
            >
              🚨 Hantar Aduan
            </Link>
            <Link
              href="/track"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-base font-bold text-slate-800"
            >
              Semak Aduan
            </Link>
            <Link
              href="/assistant"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-base font-bold text-emerald-800"
            >
              WhatsApp / Voice Bot
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Untuk Orang Awam</p>
            <p className="mt-1 text-sm text-slate-700">
              Pilih satu cara paling mudah untuk lapor atau semak status aduan anda.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="panel border-blue-200 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">大众用户</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">报修与追踪</h2>
          <p className="mt-2 text-sm text-slate-600">
            手机快速投诉、WhatsApp AI intake、实时进度查询。目标是让大众 30 秒内完成报修。
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              AI 作用: 自动分类、自动分流、自动生成 tracking
            </div>
            <Link href="/submit" className="btn-primary text-center">进入公众入口</Link>
          </div>
        </article>

        <article className="panel border-indigo-200 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-800">部门内部</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Department Workspace</h2>
          <p className="mt-2 text-sm text-slate-600">
            工单队列、分派、现场更新、通知与报表集中在一个内部工作区，减少页面切换成本。
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              AI 作用: 风险排序、重复案件识别、SLA 升级、处置建议
            </div>
            <Link href="/admin" className="btn-primary text-center">进入部门工作台</Link>
          </div>
        </article>

        <article className="panel border-amber-200 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-800">主席端</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">President Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            聚焦城市风险、资源压力、逾期案件与每周简报，让高层看到 AI 如何辅助决策而不是翻工单。
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              AI 作用: 风险预测、资源调度、广播建议、领导简报
            </div>
            <Link href="/president" className="btn-primary text-center">进入主席视图</Link>
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">Kepercayaan Awam</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white px-2 py-3">
              <p className="text-2xl font-black text-slate-900">{publicStats.total}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Jumlah</p>
            </div>
            <div className="rounded-xl bg-white px-2 py-3">
              <p className="text-2xl font-black text-blue-900">{publicStats.avgResponseHours}h</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Respon</p>
            </div>
            <div className="rounded-xl bg-white px-2 py-3">
              <p className="text-2xl font-black text-emerald-700">{publicStats.resolvedRate}%</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Selesai</p>
            </div>
          </div>
        </article>
      </section>

      <section id="kpi-strip" className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <article className="panel panel-glass kpi-command">
          <p className="kpi-icon">📊</p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("home_total_cases")}</p>
          <p className="mt-1 text-4xl font-black text-slate-900 sm:text-5xl"><CountUp target={publicStats.total} /></p>
        </article>
        <article className="panel panel-glass kpi-command">
          <p className="kpi-icon">⏱</p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("home_avg_response")}</p>
          <p className="mt-1 text-4xl font-black text-blue-900 sm:text-5xl"><CountUp target={publicStats.avgResponseHours} suffix="h" /></p>
        </article>
        <article className="panel panel-glass kpi-command">
          <p className="kpi-icon">⚡</p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("home_followup_48h")}</p>
          <p className="mt-1 text-4xl font-black text-emerald-700 sm:text-5xl"><CountUp target={publicStats.followUp48hRate} suffix="%" /></p>
        </article>
        <article className="panel panel-glass kpi-command">
          <p className="kpi-icon">✅</p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("home_resolved_rate")}</p>
          <p className="mt-1 text-4xl font-black text-emerald-700 sm:text-5xl"><CountUp target={publicStats.resolvedRate} suffix="%" /></p>
        </article>
      </section>

      <section className="hidden border-blue-200 bg-blue-50/70 sm:block panel">
        <h2 className="text-lg font-extrabold text-slate-900">Public Transparency</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">This Week Completed</p>
            <p className="text-3xl font-black text-emerald-700">{transparency.handledThisWeek}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Average First Response</p>
            <p className="text-3xl font-black text-blue-900">{transparency.avgResponse}h</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Overdue Trend vs Last Week</p>
            <p className={`text-3xl font-black ${transparency.overdueDelta <= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {transparency.overdueDelta > 0 ? "+" : ""}
              {transparency.overdueDelta}%
            </p>
          </div>
        </div>
      </section>

      <section className="hidden sm:grid panel panel-ai city-intel-full">
        <div className="city-index-ring" style={{ background: `conic-gradient(#00c2ff ${cityIndex.value * 3.6}deg, rgba(148,163,184,0.25) 0deg)` }}>
          <div className="city-index-core">
            <p className="text-3xl font-black text-cyan-100">{cityIndex.value} / 100</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200">City Intelligence Index</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-cyan-100">{cityIndex.status}</p>
      </section>

      <section className="hidden gap-4 lg:grid-cols-2 sm:grid">
        <article className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">{t("home_weekly_update")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("home_weekly_desc")}</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {weeklyUpdates.map((row) => (
              <li key={`${row.department}-${row.zone}`} className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-700">
                <span className="font-semibold">{row.department}</span> {t("home_resolved")} <span className="font-bold text-blue-900">{row.count}</span> ({row.zone}).
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">{t("home_action_board")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("home_action_desc")}</p>
          <div className="mt-3 grid gap-2">
            {departmentBoard.map((d, idx) => (
              <div key={d.department} className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("home_rank")} {idx + 1}</p>
                <p className="font-semibold text-slate-900">{d.department}</p>
                <p className="text-sm text-slate-700">{t("home_resolved")}: <span className="font-bold text-blue-900">{d.count}</span></p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
