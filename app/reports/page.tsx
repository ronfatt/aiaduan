"use client";

import { useMemo } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { getWeeklyMayorBrief } from "@/lib/aiIntel";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { formatDate, isPastDateline, percent } from "@/lib/utils";

function csvEscape(value: string | number | null | undefined) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { complaints, actionLogs, feedbacks } = useStore();
  const { t } = useI18n();
  const weeklyBrief = useMemo(
    () => getWeeklyMayorBrief(complaints, feedbacks),
    [complaints, feedbacks],
  );

  const report = useMemo(() => {
    const total = complaints.length;
    const done = complaints.filter((item) => item.status === "DONE").length;
    const overdue = complaints.filter((item) => isPastDateline(item) && item.status !== "DONE").length;
    const reminderSent = complaints.filter((item) => Boolean(item.presidentReminderSentAt)).length;
    const crossAgency = complaints.filter((item) => item.ownerAgency !== "MPT").length;
    const avgRating = feedbacks.length
      ? Number((feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length).toFixed(1))
      : 0;
    return { total, done, overdue, reminderSent, crossAgency, avgRating };
  }, [complaints, feedbacks]);

  const topRows = complaints.slice(0, 12);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />

      <section className="panel">
        <h2 className="text-xl font-extrabold text-slate-900">{t("reports_title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("reports_desc")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <article className="panel panel-glass"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("reports_total")}</p><p className="text-3xl font-black text-slate-900">{report.total}</p></article>
          <article className="panel panel-glass"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("reports_resolved")}</p><p className="text-3xl font-black text-emerald-700">{report.done}</p></article>
          <article className="panel panel-glass"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("reports_overdue")}</p><p className="text-3xl font-black text-red-700">{report.overdue}</p></article>
          <article className="panel panel-glass"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("reports_president_reminders")}</p><p className="text-3xl font-black text-blue-900">{report.reminderSent}</p></article>
          <article className="panel panel-glass"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Cross-Agency</p><p className="text-3xl font-black text-indigo-700">{report.crossAgency}</p></article>
          <article className="panel panel-glass"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Avg Feedback</p><p className="text-3xl font-black text-amber-700">{report.avgRating || "-"}</p></article>
        </div>

        <section className="mt-4 rounded-[28px] border border-blue-900/10 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_rgba(15,23,42,0.96)_58%)] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-100">AI Weekly Mayor Brief</p>
              <h3 className="mt-2 text-2xl font-black leading-tight">{weeklyBrief.headline}</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Operations</p>
                  <p className="mt-2 text-sm text-slate-100">{weeklyBrief.operationalNote}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Public View</p>
                  <p className="mt-2 text-sm text-slate-100">{weeklyBrief.publicNote}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Recommendation</p>
                  <p className="mt-2 text-sm text-slate-100">{weeklyBrief.recommendation}</p>
                </article>
              </div>
            </div>

            <button
              type="button"
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              onClick={() =>
                downloadCsv("weekly-mayor-brief.csv", [
                  ["section", "content"],
                  ["headline", weeklyBrief.headline],
                  ["operations", weeklyBrief.operationalNote],
                  ["public", weeklyBrief.publicNote],
                  ["recommendation", weeklyBrief.recommendation],
                ])
              }
            >
              Export Weekly Brief
            </button>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              downloadCsv("complaints-report.csv", [
                [
                  "id",
                  "createdAt",
                  "datelineAt",
                  "zone",
                  "department",
                  "category",
                  "urgency",
                  "status",
                  "presidentCopySentAt",
                  "presidentReminderSentAt",
                  "description",
                ],
                ...complaints.map((c) => [
                  c.id,
                  c.createdAt,
                  c.datelineAt,
                  c.zone,
                  c.department,
                  c.aiCategory,
                  c.aiUrgency,
                  c.status,
                  c.presidentCopySentAt,
                  c.presidentReminderSentAt ?? "",
                  c.description,
                ]),
              ])
            }
          >
            {t("reports_export_complaints")}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              downloadCsv("notification-log.csv", [
                ["complaintId", "time", "zone", "department", "note"],
                ...complaints.flatMap((c) =>
                  c.timeline.map((event) => [c.id, event.at, c.zone, c.department, event.note]),
                ),
              ])
            }
          >
            {t("reports_export_notifications")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              downloadCsv("action-log.csv", [
                ["complaintId", "type", "createdAt", "payload"],
                ...actionLogs.map((log) => [
                  log.complaintId,
                  log.type,
                  log.createdAt,
                  JSON.stringify(log.payload),
                ]),
              ])
            }
          >
            Export Action Log CSV
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              downloadCsv("feedback.csv", [
                ["complaintId", "token", "puasHati", "rating", "comment", "createdAt"],
                ...feedbacks.map((item) => [
                  item.complaintId,
                  item.token,
                  item.puasHati ? "YES" : "NO",
                  String(item.rating),
                  item.comment ?? "",
                  item.createdAt,
                ]),
              ])
            }
          >
            Export Feedback CSV
          </button>

          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            {t("reports_print_summary")}
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="admin-head border-b border-slate-300">
                <th className="py-2 pr-3">{t("admin_col_id")}</th>
                <th className="py-2 pr-3">{t("created")}</th>
                <th className="py-2 pr-3">{t("dateline_3d")}</th>
                <th className="py-2 pr-3">{t("department")}</th>
                <th className="py-2 pr-3">{t("status")}</th>
                <th className="py-2 pr-3">{t("reports_col_president_reminder")}</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-200">
                  <td className="py-2 pr-3 font-bold text-blue-900">{row.id}</td>
                  <td className="py-2 pr-3">{formatDate(row.createdAt)}</td>
                  <td className="py-2 pr-3">{formatDate(row.datelineAt)}</td>
                  <td className="py-2 pr-3">{row.department}</td>
                  <td className="py-2 pr-3">{row.status}</td>
                  <td className="py-2 pr-3">{row.presidentReminderSentAt ? formatDate(row.presidentReminderSentAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          {t("reports_rate_summary", { resolved: percent(report.done, report.total), overdue: percent(report.overdue, report.total) })}
        </p>
      </section>
    </div>
  );
}
