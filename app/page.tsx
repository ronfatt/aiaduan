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
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-900">
            Aduan Pintar Tawau
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-[#0B1F3B] sm:text-4xl">
            Ada Masalah di Tawau?
            <br />
            Kami Bertindak.
          </h1>
          <p className="mt-3 text-base font-semibold text-[#1d4ed8] sm:text-lg">
            Laporkan dalam 30 saat.
            <br />
            AI akan terus hantar ke jabatan berkaitan.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/submit" className="hero-main-cta">HANTAR ADUAN SEKARANG</Link>
            <Link href="/track" className="hero-secondary-cta mobile-track-btn">Semak Status</Link>
          </div>
          <div className="mt-3 hidden flex-col gap-2 sm:flex-row sm:flex">
            <Link href="/assistant" className="hero-secondary-cta text-center">
              WhatsApp AI
            </Link>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">Cepat • Mudah • Telus</p>
          <p className="mt-2 max-w-xl text-xs font-medium text-slate-500">
            Platform sokongan keputusan bandar berasaskan AI pertama di Tawau.
          </p>
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
        <article className="rounded-[28px] border border-blue-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Akses Pantas</p>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Link
              href="/submit"
              className="rounded-[22px] bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-5 text-center text-lg font-extrabold text-white shadow-lg"
            >
              📸 Hantar Aduan
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/track"
                className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-center text-base font-bold text-slate-800"
              >
                🔍 Semak Status
              </Link>
              <Link
                href="/assistant"
                className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-base font-bold text-emerald-800"
              >
                💬 WhatsApp AI
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Cara Guna</p>
          <div className="mt-4 grid gap-3">
            {[
              {
                step: "1",
                title: "Ambil gambar atau terangkan masalah",
                desc: "Masukkan aduan dengan cepat melalui borang atau WhatsApp AI.",
              },
              {
                step: "2",
                title: "AI kenal pasti isu",
                desc: "Sistem cadangkan kategori rasmi, jabatan, dan keutamaan.",
              },
              {
                step: "3",
                title: "Pihak berkuasa bertindak",
                desc: "Aduan terus masuk ke ruang kerja jabatan untuk tindakan lanjut.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">Dipercayai Untuk Demo</p>
          <p className="mt-2 text-base font-black text-slate-900">Platform aduan pintar untuk operasi bandar Tawau.</p>
          <p className="mt-2 text-sm text-slate-700">Demo pengalaman awam, ruang kerja jabatan, dan papan pemuka kepimpinan dalam satu sistem berasaskan AI.</p>
        </article>
      </section>

      <section className="hidden gap-3 lg:grid-cols-3 sm:grid">
        <article className="panel border-blue-200 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">Orang Awam</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Hantar & Jejak Aduan</h2>
          <p className="mt-2 text-sm text-slate-600">
            Aduan pantas melalui telefon, WhatsApp AI, dan semakan status masa nyata. Sasaran utama ialah warga boleh melapor dalam 30 saat.
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Peranan AI: klasifikasi automatik, penghalaan automatik, dan kod jejak automatik
            </div>
            <Link href="/submit" className="btn-primary text-center">Masuk Pintu Awam</Link>
          </div>
        </article>

        <article className="panel border-indigo-200 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-800">Jabatan Dalaman</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Ruang Kerja Jabatan</h2>
          <p className="mt-2 text-sm text-slate-600">
            Barisan kes, tugasan, kemas kini lapangan, notifikasi dan laporan dihimpunkan dalam satu ruang kerja dalaman.
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Peranan AI: susunan risiko, pengesanan kes berulang, eskalasi SLA, dan cadangan tindakan
            </div>
            <Link href="/admin" className="btn-primary text-center">Masuk Ruang Kerja Jabatan</Link>
          </div>
        </article>

        <article className="panel border-amber-200 bg-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-800">Kepimpinan</p>
          <h2 className="mt-2 text-xl font-black text-slate-900">Papan Pemuka Presiden</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tumpu pada risiko bandar, tekanan sumber, kes lewat dan ringkasan mingguan supaya kepimpinan boleh membuat keputusan dengan pantas.
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Peranan AI: ramalan risiko, cadangan sumber, syor siaran awam, dan ringkasan kepimpinan
            </div>
            <Link href="/president" className="btn-primary text-center">Masuk Paparan Presiden</Link>
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
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200">Indeks Kecerdasan Bandar</p>
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
