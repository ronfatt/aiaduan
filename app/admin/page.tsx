"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/Badges";
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

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />

      <section className="panel overflow-hidden">
        <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-800">Department Workspace</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">部门内部工作台</h2>
          <p className="mt-2 text-sm text-slate-700">
            这里给部门人员处理案件、分派负责人、更新进度。AI 会先帮你排序风险、识别重复案件，并给出行动建议。
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">AI Queue Prioritization</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">AI Recommended Action</div>
            <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700">SLA Escalation Assist</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-slate-900">Staff Queue (Rasmi + AI)</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mode:</span>
            <button type="button" className={mode === "OPERATIONAL" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("OPERATIONAL")}>Operational</button>
            <button type="button" className={mode === "LEADERSHIP" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("LEADERSHIP")}>Leadership</button>
          </div>
        </div>
        <div className="summary-strip mt-4 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hari Ini</p>
            <p className="text-sm text-slate-700">Aduan Baru</p>
            <p className="text-2xl font-extrabold text-blue-900">{dailySummary.aduanBaru}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hari Ini</p>
            <p className="text-sm text-slate-700">Kes Lewat</p>
            <p className="text-2xl font-extrabold text-red-700">{dailySummary.kesLewat}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hari Ini</p>
            <p className="text-sm text-slate-700">Risiko Tinggi</p>
            <p className="text-2xl font-extrabold text-amber-700">{dailySummary.risikoTinggi}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4" hidden={mode === "LEADERSHIP"}>
          <label className="field">Zone<select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value as Zone | "ALL")}>{zones.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Category<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | "ALL")}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | "ALL")}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Urgency<select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as Urgency | "ALL")}>{urgencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>

        {mode === "LEADERSHIP" ? <p className="mt-2 text-sm font-semibold text-red-700">Top 5 priority (high risk/escalated)</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="admin-head border-b border-slate-300">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Zon</th>
                <th className="py-2 pr-3">Kategori Rasmi</th>
                <th className="py-2 pr-3">AI Category</th>
                <th className="py-2 pr-3">Agency</th>
                <th className="py-2 pr-3 font-extrabold">AI Risk</th>
                <th className="py-2 pr-3">Escalation</th>
                <th className="py-2 pr-3">SLA Ladder</th>
                <th className="py-2 pr-3">Status</th>
                {mode === "OPERATIONAL" ? (
                  <>
                    <th className="py-2 pr-3">Urgency</th>
                    <th className="py-2 pr-3">Department</th>
                    <th className="py-2 pr-3">Dateline</th>
                    <th className="py-2 pr-3">Countdown</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {displayItems.map(({ item, ai, highRisk }) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`admin-row cursor-pointer border-b border-slate-200 hover:shadow-[0_0_0_1px_rgba(45,107,255,0.25)] ${highRisk ? "high-risk-row" : "hover:bg-slate-50"}`}
                >
                  <td className="py-2 pr-3 font-bold text-blue-900">{item.id}</td>
                  <td className="py-2 pr-3">{item.zone}</td>
                  <td className="py-2 pr-3 font-semibold">{item.rasmiJenisAduan}</td>
                  <td className="py-2 pr-3"><CategoryBadge category={item.aiCategory} /></td>
                  <td className="py-2 pr-3"><span className="badge border border-slate-200 bg-slate-100 text-slate-700">{item.ownerAgency}</span></td>
                  <td className="py-2 pr-3 font-extrabold text-slate-900"><span className="risk-score-chip">{ai.riskScore}</span></td>
                  <td className="py-2 pr-3">{ai.escalation ? <span className="badge border border-red-200 bg-red-100 text-red-800">AI Escalated</span> : <span className="text-xs text-slate-500">No</span>}</td>
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
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Complaint Detail</p>
              <h3 className="text-lg font-extrabold text-slate-900">{selected.id}</h3>
              <p className="text-xs text-slate-500">{formatDate(selected.createdAt)}</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setSelectedId(null)}>Close</button>
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

            <p><span className="font-semibold">AI Summary:</span> {selected.aiSummary}</p>
            <p><span className="font-semibold">AI Risk Score:</span> {selectedAi.riskScore}</p>
            <div className="rounded border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-800">One-Stop Center Routing</p>
              <p className="mt-1"><span className="font-semibold">Owner Agency:</span> {selected.ownerAgency}</p>
              <p><span className="font-semibold">Confidence:</span> {selected.ownerAgencyConfidence}%</p>
              <p><span className="font-semibold">Reason:</span> {selected.ownerAgencyReason}</p>
              <p><span className="font-semibold">Predicted ETA:</span> {selected.predictedEtaHours}h</p>
              <p><span className="font-semibold">ETA Reason:</span> {selected.predictedEtaReason}</p>
              <p><span className="font-semibold">Assigned Officer Role:</span> {selected.assignedOfficerRole ?? "Not set"}</p>
              <p><span className="font-semibold">Reopen Count:</span> {selected.reopenCount}</p>
              {selected.forwardPackage ? (
                <div className="mt-2 rounded border border-indigo-200 bg-white p-2 text-xs">
                  <p className="font-semibold">Forward Package</p>
                  <p>To: {selected.forwardPackage.toAgency}</p>
                  <p>Subject: {selected.forwardPackage.subject}</p>
                  <p>Attachments: {selected.forwardPackage.attachmentsMeta.length}</p>
                </div>
              ) : (
                <p><span className="font-semibold">Forward Package:</span> Not required (MPT owner)</p>
              )}
            </div>
            <div className="rounded border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-800">AI Playbook Recommendation</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {selected.playbookActions.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Before/After Evidence</p>
              <p className="mt-1"><span className="font-semibold">Before:</span> {selected.fieldEvidence.beforeMediaUrl ? "Uploaded" : "No file"}</p>
              <p><span className="font-semibold">After:</span> {selected.fieldEvidence.afterMediaUrl ? "Uploaded" : "No file"}</p>
              <p><span className="font-semibold">Completed At:</span> {selected.fieldEvidence.completedAt ? formatDate(selected.fieldEvidence.completedAt) : "-"}</p>
            </div>

            <details className="rounded border border-slate-200 bg-slate-50 p-2">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">AI Triage JSON + Vision</summary>
              <div className="mt-2 grid gap-1 text-xs text-slate-700">
                <p><span className="font-semibold">Model:</span> {selected.aiModelMeta.model} ({selected.aiModelMeta.version})</p>
                <p><span className="font-semibold">Vision Summary:</span> {selected.aiVisionSummary ?? "None"}</p>
                <p><span className="font-semibold">Vision Labels:</span> {selected.aiVisionLabels?.join(", ") ?? "-"}</p>
                <pre className="overflow-auto rounded border border-slate-200 bg-white p-2">{JSON.stringify(selected.aiTriageJson, null, 2)}</pre>
              </div>
            </details>

            <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Citizen Identity + Integrity</p>
              <p className="mt-1"><span className="font-semibold">Reporter:</span> {selected.reporterName}</p>
              <p><span className="font-semibold">Phone:</span> {selected.reporterPhone}</p>
              <p><span className="font-semibold">Email:</span> {selected.reporterEmail ?? "-"}</p>
              <p><span className="font-semibold">IC Hash:</span> {selected.dataIntegrity.icHash}</p>
              <p><span className="font-semibold">Consent:</span> {selected.dataIntegrity.consentChecked ? "Checked" : "No"}</p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Action Log (Latest)</p>
              <ul className="mt-2 grid gap-2 text-xs">
                {selectedLogs.length ? (
                  selectedLogs.map((log, idx) => (
                    <li key={`${log.complaintId}-${log.createdAt}-${idx}`} className="rounded border border-slate-200 bg-white p-2">
                      <p className="font-semibold">{log.type}</p>
                      <p className="text-slate-500">{formatDate(log.createdAt)}</p>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500">No action log.</li>
                )}
              </ul>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Feedback Snapshot</p>
              {selectedFeedback ? (
                <div className="mt-1 text-sm">
                  <p><span className="font-semibold">Rating:</span> {selectedFeedback.rating}/5</p>
                  <p><span className="font-semibold">Puas Hati:</span> {selectedFeedback.puasHati ? "Yes" : "No"}</p>
                  <p><span className="font-semibold">Comment:</span> {selectedFeedback.comment ?? "-"}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-600">No feedback yet.</p>
              )}
            </div>
            <p><span className="font-semibold">President Reminder:</span> {selected.presidentReminderSentAt ? formatDate(selected.presidentReminderSentAt) : presidentReminderNeeded(selected) ? "Pending" : "Not required"}</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <button className="btn-secondary" onClick={() => updateStatus(selected.id, "ASSIGNED")}>ASSIGNED</button>
            <button className="btn-secondary" onClick={() => updateStatus(selected.id, "IN_PROGRESS")}>IN PROGRESS</button>
            <button className="btn-primary" onClick={() => updateStatus(selected.id, "DONE")}>DONE</button>
          </div>
          {selected.status === "DONE" ? (
            <button className="btn-secondary mt-2 w-full" onClick={() => reopenComplaint(selected.id, "Manual reopen by admin.")}>
              REOPEN
            </button>
          ) : null}
        </aside>
      ) : null}

      <section className="panel lg:col-start-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">AI Auditability</p>
        <p className="mt-1 text-sm text-slate-700">Current local audit records: <span className="font-bold text-blue-900">{aiLogs.length}</span></p>
      </section>
    </div>
  );
}
