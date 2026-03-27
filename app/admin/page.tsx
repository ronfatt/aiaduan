"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/Badges";
import { CountUp } from "@/components/CountUp";
import { OpsAiAssistant } from "@/components/OpsAiAssistant";
import { getAdminAiAction, getSimilarCaseStats } from "@/lib/aiIntel";
import { useStore } from "@/lib/store";
import {
  Category,
  Complaint,
  ComplaintStatus,
  PegawaiBertanggungjawab,
  RasmiStatus,
  Urgency,
  Zone,
} from "@/lib/types";
import { datelineCountdown, formatDate, isPastDateline, presidentReminderNeeded } from "@/lib/utils";

const zones: Array<Zone | "ALL"> = ["ALL", "Bandar", "Apas", "Balung", "Kampung", "Kuhara", "Tanjung Batu"];
const categories: Array<Category | "ALL"> = ["ALL", "ROAD", "WASTE", "DRAINAGE", "STREETLIGHT", "ANIMALS", "ILLEGAL_STALL"];
const statuses: Array<ComplaintStatus | "ALL"> = ["ALL", "RECEIVED", "ASSIGNED", "IN_PROGRESS", "DONE"];
const urgencies: Array<Urgency | "ALL"> = ["ALL", "LOW", "MEDIUM", "HIGH"];
const pegawaiList: PegawaiBertanggungjawab[] = [
  "PRESIDEN",
  "TP",
  "SUP",
  "BR",
  "PSU(P)",
  "KPSU(O)/PPK/PPKP/PPO",
  "KJU/JU I/II/III/PJU",
  "PHB",
  "PUU",
  "PTM",
  "JAD",
  "PPLB",
];

function countdown(item: Complaint, nowMs: number) {
  return datelineCountdown(item, nowMs);
}

function riskTone(score: number) {
  if (score >= 85) {
    return {
      ring: "rgba(255,77,79,0.28)",
      fill: "linear-gradient(90deg, #ff7a7c, #ff4d4f)",
      glow: "rgba(255,77,79,0.25)",
    };
  }
  if (score >= 70) {
    return {
      ring: "rgba(245,158,11,0.24)",
      fill: "linear-gradient(90deg, #ffd86b, #f59e0b)",
      glow: "rgba(245,158,11,0.22)",
    };
  }
  return {
    ring: "rgba(45,107,255,0.22)",
    fill: "linear-gradient(90deg, #74a2ff, #2d6bff)",
    glow: "rgba(45,107,255,0.22)",
  };
}

export default function AdminPage() {
  const { complaints, aiLogs, actionLogs, feedbacks, updateStatus, updatePegawai, updateMaklumatTindakan, reopenComplaint } = useStore();

  const [zoneFilter, setZoneFilter] = useState<Zone | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<Category | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "ALL">("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | "ALL">("ALL");
  const [mode, setMode] = useState<"OPERATIONAL" | "LEADERSHIP">("OPERATIONAL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(
    () =>
      complaints.filter((item) => {
        if (zoneFilter !== "ALL" && item.zone !== zoneFilter) return false;
        if (categoryFilter !== "ALL" && item.aiCategory !== categoryFilter) return false;
        if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
        if (urgencyFilter !== "ALL" && item.aiUrgency !== urgencyFilter) return false;
        return true;
      }),
    [complaints, zoneFilter, categoryFilter, statusFilter, urgencyFilter],
  );

  const selected = selectedId ? complaints.find((c) => c.id === selectedId) : null;
  const selectedAi = selected ? getAdminAiAction(selected) : null;
  const selectedLogs = useMemo(
    () =>
      selected
        ? actionLogs
            .filter((log) => log.complaintId === selected.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 6)
        : [],
    [actionLogs, selected],
  );
  const selectedFeedback = useMemo(
    () =>
      selected
        ? feedbacks.find((item) => item.complaintId === selected.id) ?? null
        : null,
    [feedbacks, selected],
  );
  const dailySummary = useMemo(() => {
    const today = new Date().toDateString();
    const aduanBaru = complaints.filter((item) => new Date(item.createdAt).toDateString() === today).length;
    const kesLewat = complaints.filter((item) => item.status !== "DONE" && isPastDateline(item)).length;
    const risikoTinggi = complaints.filter((item) => {
      const ai = getAdminAiAction(item);
      return item.status !== "DONE" && ai.riskScore >= 80;
    }).length;
    return { aduanBaru, kesLewat, risikoTinggi };
  }, [complaints]);

  const displayItems = useMemo(() => {
    const base = filtered
      .map((item) => {
        const ai = getAdminAiAction(item);
        const stats = getSimilarCaseStats(complaints, { zone: item.zone, category: item.aiCategory });
        const highRisk = (isPastDateline(item) && item.status !== "DONE") || ai.riskScore > 80;
        return { item, ai, stats, highRisk };
      })
      .sort((a, b) => b.ai.riskScore - a.ai.riskScore);

    if (mode === "LEADERSHIP") return base.filter((row) => row.ai.escalation || row.highRisk).slice(0, 5);
    return base;
  }, [filtered, complaints, mode]);

  const queueStats = useMemo(() => {
    const escalated = displayItems.filter((row) => row.ai.escalation).length;
    const presidentLevel = displayItems.filter((row) => row.item.slaEscalationLevel === "PRESIDENT").length;
    const avgRisk = displayItems.length
      ? Math.round(displayItems.reduce((sum, row) => sum + row.ai.riskScore, 0) / displayItems.length)
      : 0;
    return { escalated, presidentLevel, avgRisk };
  }, [displayItems]);

  const liveTargetId = useMemo(() => {
    const priorityRows = displayItems.filter((row) => row.ai.escalation || row.highRisk);
    if (!priorityRows.length) return null;
    const idx = Math.floor(nowMs / 2400) % priorityRows.length;
    return priorityRows[idx]?.item.id ?? null;
  }, [displayItems, nowMs]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />

      <section className="panel overflow-hidden">
        <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-800">Ruang Kerja Jabatan</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">Pusat Operasi Dalaman</h2>
          <p className="mt-2 text-sm text-slate-700">
            Ruang ini digunakan oleh pegawai jabatan untuk mengurus kes, menetapkan pegawai bertanggungjawab, dan mengemas kini kemajuan kerja.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">Susunan Barisan oleh AI</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">Cadangan Tindakan AI</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">Bantuan Eskalasi SLA</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-slate-900">Barisan Kes Jabatan (Rasmi + AI)</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mod:</span>
            <button type="button" className={mode === "OPERATIONAL" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("OPERATIONAL")}>Operasi</button>
            <button type="button" className={mode === "LEADERSHIP" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("LEADERSHIP")}>Kepimpinan</button>
          </div>
        </div>
        <div className="summary-strip mt-4 grid gap-2 md:grid-cols-3">
          <div className="summary-tile rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hari Ini</p>
            <p className="mt-1 text-sm text-slate-700">Aduan Baru</p>
            <p className="mt-1 text-3xl font-extrabold text-blue-900"><CountUp target={dailySummary.aduanBaru} /></p>
          </div>
          <div className="summary-tile rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hari Ini</p>
            <p className="mt-1 text-sm text-slate-700">Kes Lewat</p>
            <p className="mt-1 text-3xl font-extrabold text-red-700"><CountUp target={dailySummary.kesLewat} /></p>
          </div>
          <div className="summary-tile rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hari Ini</p>
            <p className="mt-1 text-sm text-slate-700">Risiko Tinggi</p>
            <p className="mt-1 text-3xl font-extrabold text-amber-700"><CountUp target={dailySummary.risikoTinggi} /></p>
          </div>
        </div>

        <div className="admin-queue-live mt-4 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-200">AI Queue Monitor</p>
              <p className="mt-1 text-sm text-slate-200">Sistem sedang menyusun kes, mengesan eskalasi, dan memantau tekanan operasi jabatan.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="admin-live-pill"><span className="status-dot" />Segerak</span>
              <span className="admin-live-pill">AI Eskalasi: {queueStats.escalated}</span>
              <span className="admin-live-pill">Tahap Presiden: {queueStats.presidentLevel}</span>
              <span className="admin-live-pill">Purata Risiko: {queueStats.avgRisk}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <OpsAiAssistant scope="department" complaints={complaints} />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4" hidden={mode === "LEADERSHIP"}>
          <label className="field">Zon<select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value as Zone | "ALL")}>{zones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Kategori<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | "ALL")}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | "ALL")}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Keutamaan<select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as Urgency | "ALL")}>{urgencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>

        {mode === "LEADERSHIP" ? <p className="mt-2 text-sm font-semibold text-red-700">5 kes utama (risiko tinggi / dieskalasi)</p> : null}

        <div className="admin-table-wrap mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="admin-head border-b border-slate-300">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Zon</th>
                <th className="py-2 pr-3">Kategori Rasmi</th>
                <th className="py-2 pr-3">Kategori AI</th>
                <th className="py-2 pr-3">Agensi</th>
                <th className="py-2 pr-3 font-extrabold">AI Risk</th>
                <th className="py-2 pr-3">Eskalasi</th>
                <th className="py-2 pr-3">Tahap SLA</th>
                <th className="py-2 pr-3">Status</th>
                {mode === "OPERATIONAL" ? (
                  <>
                    <th className="py-2 pr-3">Keutamaan</th>
                    <th className="py-2 pr-3">Jabatan</th>
                    <th className="py-2 pr-3">Tarikh Akhir</th>
                    <th className="py-2 pr-3">Baki Masa</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {displayItems.map(({ item, ai, highRisk }) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`admin-row cursor-pointer border-b border-slate-200 hover:shadow-[0_0_0_1px_rgba(45,107,255,0.25)] ${highRisk ? "high-risk-row" : "hover:bg-slate-50"} ${liveTargetId === item.id ? "live-monitor-row" : ""}`}
                >
                  <td className="py-2 pr-3 font-bold text-blue-900">{item.id}</td>
                  <td className="py-2 pr-3">{item.zone}</td>
                  <td className="py-2 pr-3 font-semibold">{item.rasmiJenisAduan}</td>
                  <td className="py-2 pr-3"><CategoryBadge category={item.aiCategory} /></td>
                  <td className="py-2 pr-3"><span className="badge border border-slate-200 bg-slate-100 text-slate-700">{item.ownerAgency}</span></td>
                  <td className="py-2 pr-3 font-extrabold text-slate-900">
                    <div className="risk-score-wrap">
                      <span
                        className="risk-score-chip"
                        style={
                          {
                            ["--risk-ring" as string]: riskTone(ai.riskScore).ring,
                            ["--risk-fill" as string]: riskTone(ai.riskScore).fill,
                            ["--risk-glow" as string]: riskTone(ai.riskScore).glow,
                          } as CSSProperties
                        }
                      >
                        {ai.riskScore}
                      </span>
                      <span className="risk-mini-track">
                        <span className="risk-mini-fill" style={{ width: `${ai.riskScore}%`, background: riskTone(ai.riskScore).fill }} />
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3">{ai.escalation ? <span className="badge ai-escalation-badge">AI Eskalasi</span> : <span className="text-xs text-slate-500">Tidak</span>}</td>
                  <td className="py-2 pr-3"><span className="badge border border-slate-200 bg-slate-100 text-slate-700">{item.slaEscalationLevel}</span></td>
                  <td className="py-2 pr-3"><StatusBadge status={item.status} /></td>
                  {mode === "OPERATIONAL" ? (
                    <>
                      <td className="py-2 pr-3"><UrgencyBadge urgency={item.aiUrgency} /></td>
                      <td className="py-2 pr-3">{item.department}</td>
                      <td className="py-2 pr-3 font-semibold">{formatDate(item.datelineAt)}</td>
                      <td className={`py-2 pr-3 font-semibold ${isPastDateline(item) ? "text-red-700" : "text-slate-700"}`}>{countdown(item, nowMs)}</td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && selectedAi ? (
        <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-slate-300 bg-white p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Butiran Aduan</p>
              <h3 className="text-lg font-extrabold text-slate-900">{selected.id}</h3>
              <p className="text-xs text-slate-500">{formatDate(selected.createdAt)}</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setSelectedId(null)}>Tutup</button>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            <p><span className="font-semibold">Kategori Rasmi (Majlis):</span> {selected.rasmiJenisAduan}</p>
            <p><span className="font-semibold">Pegawai Bertanggungjawab:</span></p>
            <select
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
              value={selected.rasmiPegawaiBertanggungjawab ?? ""}
              onChange={(e) => updatePegawai(selected.id, (e.target.value || null) as PegawaiBertanggungjawab | null)}
            >
              <option value="">-- Pilih Pegawai --</option>
              {pegawaiList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-900">Maklumat Tindakan (Rasmi)</p>
              <label className="field mt-2">
                Tarikh Maklumbalas
                <input
                  type="datetime-local"
                  value={selected.rasmiMaklumatTindakan.tarikhMaklumbalas?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    updateMaklumatTindakan(selected.id, {
                      tarikhMaklumbalas: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </label>
              <label className="field mt-2">
                Tindakan
                <textarea
                  rows={2}
                  value={selected.rasmiMaklumatTindakan.tindakan ?? ""}
                  onChange={(e) => updateMaklumatTindakan(selected.id, { tindakan: e.target.value || null })}
                />
              </label>
              <label className="field mt-2">
                Tarikh Tindakan
                <input
                  type="datetime-local"
                  value={selected.rasmiMaklumatTindakan.tarikhTindakan?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    updateMaklumatTindakan(selected.id, {
                      tarikhTindakan: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
              </label>
              <label className="field mt-2">
                Status Rasmi
                <select
                  value={selected.rasmiMaklumatTindakan.statusRasmi ?? "Dalam Tindakan"}
                  onChange={(e) =>
                    updateMaklumatTindakan(selected.id, { statusRasmi: e.target.value as RasmiStatus })
                  }
                >
                  <option>Dalam Tindakan</option>
                  <option>Selesai</option>
                </select>
              </label>
              <label className="field mt-2">
                Maklumat Tambahan
                <textarea
                  rows={2}
                  value={selected.rasmiMaklumatTindakan.maklumatTambahan ?? ""}
                  onChange={(e) =>
                    updateMaklumatTindakan(selected.id, { maklumatTambahan: e.target.value || null })
                  }
                />
              </label>
            </div>

            <p><span className="font-semibold">Ringkasan AI:</span> {selected.aiSummary}</p>
            <p><span className="font-semibold">Skor Risiko AI:</span> {selectedAi.riskScore}</p>
            <div className="rounded border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">Penghalaan One-Stop Center</p>
              <p className="mt-1"><span className="font-semibold">Agensi Pemilik:</span> {selected.ownerAgency}</p>
              <p><span className="font-semibold">Keyakinan:</span> {selected.ownerAgencyConfidence}%</p>
              <p><span className="font-semibold">Sebab:</span> {selected.ownerAgencyReason}</p>
              <p><span className="font-semibold">ETA Ramalan:</span> {selected.predictedEtaHours}j</p>
              <p><span className="font-semibold">Sebab ETA:</span> {selected.predictedEtaReason}</p>
              <p><span className="font-semibold">Peranan Pegawai:</span> {selected.assignedOfficerRole ?? "Belum ditetapkan"}</p>
              <p><span className="font-semibold">Bilangan Buka Semula:</span> {selected.reopenCount}</p>
              {selected.forwardPackage ? (
                <div className="mt-2 rounded border border-indigo-200 bg-white p-2 text-xs">
                  <p className="font-semibold">Pakej Rujukan</p>
                  <p>Kepada: {selected.forwardPackage.toAgency}</p>
                  <p>Subjek: {selected.forwardPackage.subject}</p>
                  <p>Lampiran: {selected.forwardPackage.attachmentsMeta.length}</p>
                </div>
              ) : (
                <p><span className="font-semibold">Pakej Rujukan:</span> Tidak diperlukan (di bawah MPT)</p>
              )}
            </div>
            <div className="rounded border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Cadangan Playbook AI</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {selected.playbookActions.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Bukti Sebelum / Selepas</p>
              <p className="mt-1"><span className="font-semibold">Sebelum:</span> {selected.fieldEvidence.beforeMediaUrl ? "Dimuat naik" : "Tiada fail"}</p>
              <p><span className="font-semibold">Selepas:</span> {selected.fieldEvidence.afterMediaUrl ? "Dimuat naik" : "Tiada fail"}</p>
              <p><span className="font-semibold">Selesai Pada:</span> {selected.fieldEvidence.completedAt ? formatDate(selected.fieldEvidence.completedAt) : "-"}</p>
            </div>

            <details className="rounded border border-slate-200 bg-slate-50 p-2">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">JSON Triage AI + Visi</summary>
              <div className="mt-2 grid gap-1 text-xs text-slate-700">
                <p><span className="font-semibold">Model:</span> {selected.aiModelMeta.model} ({selected.aiModelMeta.version})</p>
                <p><span className="font-semibold">Ringkasan Visi:</span> {selected.aiVisionSummary ?? "Tiada"}</p>
                <p><span className="font-semibold">Label Visi:</span> {selected.aiVisionLabels?.join(", ") ?? "-"}</p>
                <pre className="overflow-auto rounded border border-slate-200 bg-white p-2">{JSON.stringify(selected.aiTriageJson, null, 2)}</pre>
              </div>
            </details>

            <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Identiti Pengadu + Integriti Data</p>
              <p className="mt-1"><span className="font-semibold">Pengadu:</span> {selected.reporterName}</p>
              <p><span className="font-semibold">Telefon:</span> {selected.reporterPhone}</p>
              <p><span className="font-semibold">Emel:</span> {selected.reporterEmail ?? "-"}</p>
              <p><span className="font-semibold">Hash IC:</span> {selected.dataIntegrity.icHash}</p>
              <p><span className="font-semibold">Persetujuan:</span> {selected.dataIntegrity.consentChecked ? "Disahkan" : "Tidak"}</p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Log Tindakan (Terkini)</p>
              <ul className="mt-2 grid gap-2 text-xs">
                {selectedLogs.length ? (
                  selectedLogs.map((log, idx) => (
                    <li key={`${log.complaintId}-${log.createdAt}-${idx}`} className="rounded border border-slate-200 bg-white p-2">
                      <p className="font-semibold">{log.type}</p>
                      <p className="text-slate-500">{formatDate(log.createdAt)}</p>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">Tiada log tindakan.</li>
                )}
              </ul>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Ringkasan Maklum Balas</p>
              {selectedFeedback ? (
                <div className="mt-1 text-sm">
                  <p><span className="font-semibold">Penilaian:</span> {selectedFeedback.rating}/5</p>
                  <p><span className="font-semibold">Puas Hati:</span> {selectedFeedback.puasHati ? "Ya" : "Tidak"}</p>
                  <p><span className="font-semibold">Komen:</span> {selectedFeedback.comment ?? "-"}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Belum ada maklum balas.</p>
              )}
            </div>
            <p><span className="font-semibold">Peringatan Presiden:</span> {selected.presidentReminderSentAt ? formatDate(selected.presidentReminderSentAt) : presidentReminderNeeded(selected) ? "Menunggu" : "Tidak diperlukan"}</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button className="btn-secondary" onClick={() => updateStatus(selected.id, "ASSIGNED")}>ASSIGNED</button>
            <button className="btn-secondary" onClick={() => updateStatus(selected.id, "IN_PROGRESS")}>IN PROGRESS</button>
            <button className="btn-primary" onClick={() => updateStatus(selected.id, "DONE")}>DONE</button>
          </div>
          {selected.status === "DONE" ? (
            <button className="btn-secondary mt-2 w-full" onClick={() => reopenComplaint(selected.id, "Manual reopen by admin.")}>
              BUKA SEMULA
            </button>
          ) : null}
        </aside>
      ) : null}

      <section className="panel lg:col-start-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Audit AI</p>
        <p className="mt-1 text-sm text-slate-700">Rekod audit tempatan semasa: <span className="font-bold text-blue-900">{aiLogs.length}</span></p>
      </section>
    </div>
  );
}
