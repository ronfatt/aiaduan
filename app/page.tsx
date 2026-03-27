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

  const statusOverview = useMemo(() => {
    const resolved = complaints.filter((item) => item.status === "DONE");
    const inProgress = complaints.filter(
      (item) => item.status === "ASSIGNED" || item.status === "IN_PROGRESS",
    );
    const newlyOpened = complaints.filter((item) => item.status === "RECEIVED");

    const thisDayMs = 24 * 60 * 60 * 1000;
    const prevDayMs = thisDayMs * 2;

    const computeDelta = (items: typeof complaints) => {
      const today = items.filter((item) => nowMs - new Date(item.createdAt).getTime() <= thisDayMs).length;
      const yesterday = items.filter((item) => {
        const diff = nowMs - new Date(item.createdAt).getTime();
        return diff > thisDayMs && diff <= prevDayMs;
      }).length;
      return today - yesterday;
    };

    return [
      {
        key: "resolved",
        title: "Selesai",
        label: "Kes Diselesaikan",
        value: resolved.length,
        delta: computeDelta(resolved),
        tone: "emerald",
      },
      {
        key: "in-progress",
        title: "Sedang Diproses",
        label: "Dalam Tindakan",
        value: inProgress.length,
        delta: computeDelta(inProgress),
        tone: "amber",
      },
      {
        key: "new",
        title: "Aduan Baru",
        label: "Menunggu Tindakan",
        value: newlyOpened.length,
        delta: computeDelta(newlyOpened),
        tone: "red",
      },
    ] as const;
  }, [complaints, nowMs]);

  return (
    <div className="grid gap-4 pb-24 sm:pb-0">
      <section className="hero-shell panel neural-grid overflow-hidden rounded-[28px] border-none px-5 py-7 shadow-[0_18px_44px_rgba(13,31,59,0.18)] sm:px-6 sm:py-8 lg:grid lg:grid-cols-2 lg:items-center">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-streak" />
        <div className="relative z-10 text-center sm:text-left">
          <p className="inline-flex rounded-full bg-white/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
            Aduan Pintar Tawau
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] text-white sm:text-5xl">
            Ada Masalah di Tawau?
            <br />
            Kami Bertindak.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-blue-100 sm:mx-0 sm:text-lg">
            Laporkan dalam 30 saat.
            <br />
            AI akan terus hantar ke jabatan berkaitan.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/submit" className="hero-main-cta">Hantar Aduan Sekarang</Link>
            <Link href="/track" className="hero-secondary-cta mobile-track-btn">Semak Status</Link>
          </div>
          <div className="mt-3 hidden flex-col gap-2 sm:flex-row sm:flex">
            <Link href="/assistant" className="hero-secondary-cta text-center">
              WhatsApp AI
            </Link>
          </div>
          <p className="mt-4 text-sm font-semibold text-blue-100">Cepat • Mudah • Telus</p>
          <p className="mt-2 max-w-xl text-xs font-medium text-blue-200/85">
            Platform sokongan keputusan bandar berasaskan AI untuk pelaporan awam yang lebih pantas.
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
        <article className="landing-card rounded-[28px] border border-blue-100 bg-white p-4 shadow-[0_12px_28px_rgba(13,31,59,0.08)]">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Akses Pantas</p>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Link
              href="/submit"
              className="rounded-[22px] bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-5 text-center text-lg font-extrabold text-white shadow-lg shadow-blue-500/20"
            >
              📸 Hantar Aduan
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/track"
                className="landing-quick-card rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-center text-base font-bold text-slate-800 shadow-sm"
              >
                🔍 Semak Status
              </Link>
              <Link
                href="/assistant"
                className="landing-quick-card rounded-[20px] border border-cyan-200 bg-cyan-50 px-4 py-4 text-center text-base font-bold text-cyan-800 shadow-sm"
              >
                💬 WhatsApp AI
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="landing-card rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(13,31,59,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Status Aduan Terkini</p>
              <p className="mt-2 text-sm text-slate-600">Prestasi aduan semasa untuk membina keyakinan awam dan membantu pemantauan operasi.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700">
              Live
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {statusOverview.map((item) => {
              const palette =
                item.tone === "emerald"
                  ? {
                      shell: "border-emerald-100 bg-emerald-50/70",
                      badge: "bg-emerald-100 text-emerald-800",
                      number: "text-emerald-700",
                      bar: "from-emerald-400 to-emerald-600",
                    }
                  : item.tone === "amber"
                    ? {
                        shell: "border-amber-100 bg-amber-50/70",
                        badge: "bg-amber-100 text-amber-800",
                        number: "text-amber-700",
                        bar: "from-amber-300 to-amber-500",
                      }
                    : {
                        shell: "border-red-100 bg-red-50/70",
                        badge: "bg-red-100 text-red-800",
                        number: "text-red-700",
                        bar: "from-red-300 to-red-500",
                      };

              return (
                <div key={item.key} className={`status-live-card rounded-[22px] border px-4 py-4 shadow-sm ${palette.shell}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${palette.badge}`}>
                      {item.delta > 0 ? `+${item.delta} hari ini` : item.delta < 0 ? `${item.delta} hari ini` : "Stabil"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className={`text-4xl font-black ${palette.number}`}>{item.value}</p>
                    <p className="text-xs text-slate-500">Kemaskini terakhir: sebentar tadi</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${palette.bar}`}
                      style={{ width: `${Math.max(18, Math.min(100, item.value * 6))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="landing-card rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(13,31,59,0.08)]">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Kelebihan Utama</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { icon: "⚡", title: "Cepat", desc: "30 saat" },
              { icon: "🧠", title: "AI Automatik", desc: "Klasifikasi terus" },
              { icon: "🏛", title: "Terus ke Jabatan", desc: "Hantar automatik" },
            ].map((item) => (
              <div key={item.title} className="feature-mini-card rounded-[22px] border border-slate-100 bg-slate-50 px-3 py-4 text-center">
                <p className="text-xl">{item.icon}</p>
                <p className="mt-2 text-xs font-extrabold text-slate-900">{item.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-3 sm:hidden">
        <article className="landing-card rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-[0_12px_28px_rgba(13,31,59,0.08)]">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-blue-800 shadow-sm">
              Platform AI Smart Governance untuk Tawau
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-cyan-800 shadow-sm">
              Powered by Edura Tech
            </span>
          </div>
          <p className="mt-3 text-center text-sm text-slate-700">
            Direka untuk pelaporan awam yang lebih pantas, telus, dan tersusun.
          </p>
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
        <h2 className="text-lg font-extrabold text-slate-900">Status Aduan Terkini</h2>
        <p className="mt-1 text-sm text-slate-600">Prestasi aduan semasa untuk membina keyakinan awam dan membantu pemantauan operasi.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {statusOverview.map((item) => (
            <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 text-4xl font-black text-slate-900">{item.value}</p>
              <p
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                  item.tone === "emerald"
                    ? "bg-emerald-100 text-emerald-800"
                    : item.tone === "amber"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="hidden sm:grid panel">
        <h2 className="text-lg font-extrabold text-slate-900">Kelebihan Utama</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "⚡", title: "Cepat", desc: "Laporan ringkas dalam 30 saat." },
            { icon: "🧠", title: "AI Automatik", desc: "AI cadangkan kategori, jabatan, dan keutamaan." },
            { icon: "🏛", title: "Terus ke Jabatan", desc: "Kes dihantar terus ke ruang kerja jabatan berkaitan." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl">{item.icon}</p>
              <p className="mt-3 text-base font-extrabold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
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
