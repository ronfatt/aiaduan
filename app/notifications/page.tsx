"use client";

import { useMemo, useState } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { getPublicBroadcasts } from "@/lib/aiIntel";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

type NoticeType = "ALL" | "COPY" | "REMINDER" | "ESCALATION" | "STATUS";

function classify(type: string): Exclude<NoticeType, "ALL"> {
  if (type === "FORWARD_PREPARED") return "COPY";
  if (type === "FEEDBACK_SENT") return "REMINDER";
  if (type === "HUMAN_OVERRIDE") return "ESCALATION";
  return "STATUS";
}

export default function NotificationsPage() {
  const { complaints, actionLogs } = useStore();
  const { t } = useI18n();
  const [filter, setFilter] = useState<NoticeType>("ALL");
  const broadcasts = useMemo(() => getPublicBroadcasts(complaints), [complaints]);

  const items = useMemo(() => {
    const all = actionLogs.map((event) => {
      const complaint = complaints.find((item) => item.id === event.complaintId);
      return {
        complaintId: event.complaintId,
        zone: complaint?.zone ?? "-",
        department: complaint?.department ?? "-",
        at: event.createdAt,
        note: typeof event.payload === "object" ? JSON.stringify(event.payload) : String(event.payload),
        type: classify(event.type),
      };
    });

    const sorted = all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return filter === "ALL" ? sorted : sorted.filter((event) => event.type === filter);
  }, [actionLogs, complaints, filter]);

  const typeLabel = (type: NoticeType) => {
    if (type === "ALL") return t("common_all");
    if (type === "COPY") return t("notifications_type_copy");
    if (type === "REMINDER") return t("notifications_type_reminder");
    if (type === "ESCALATION") return t("notifications_type_escalation");
    return t("notifications_type_status");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />

      <section className="panel overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t("notifications_title")}</h2>
            <p className="mt-1 text-sm text-slate-600">{t("notifications_desc")}</p>
          </div>

          <label className="field w-48">
            {t("filter")}
            <select value={filter} onChange={(e) => setFilter(e.target.value as NoticeType)}>
              <option value="ALL">{typeLabel("ALL")}</option>
              <option value="COPY">{typeLabel("COPY")}</option>
              <option value="REMINDER">{typeLabel("REMINDER")}</option>
              <option value="ESCALATION">{typeLabel("ESCALATION")}</option>
              <option value="STATUS">{typeLabel("STATUS")}</option>
            </select>
          </label>
        </div>

        <section className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Proactive Public Broadcast</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                Sistem boleh mencetus amaran awam sebelum lebih banyak aduan masuk.
              </h3>
            </div>
            <span className="badge border border-amber-300 bg-white text-amber-700">
              {broadcasts.length} active broadcasts
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {broadcasts.length ? (
              broadcasts.map((item) => (
                <article key={item.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        {item.zone} • {item.channel}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        item.severity === "HIGH"
                          ? "border border-red-200 bg-red-50 text-red-700"
                          : "border border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{item.message}</p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Tiada siaran awam proaktif diperlukan sekarang. Sistem terus memantau pola aduan.
              </div>
            )}
          </div>
        </section>

        <table className="mt-4 min-w-full text-left text-sm">
          <thead>
            <tr className="admin-head border-b border-slate-300">
              <th className="py-2 pr-3">{t("time")}</th>
              <th className="py-2 pr-3">{t("type")}</th>
              <th className="py-2 pr-3">{t("notifications_col_complaint")}</th>
              <th className="py-2 pr-3">{t("zone")}</th>
              <th className="py-2 pr-3">{t("department")}</th>
              <th className="py-2 pr-3">{t("notice")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`${item.complaintId}-${item.at}-${idx}`} className="border-b border-slate-200">
                <td className="py-2 pr-3">{formatDate(item.at)}</td>
                <td className="py-2 pr-3">
                  <span className="badge border border-slate-200 bg-slate-100 text-slate-700">{typeLabel(item.type)}</span>
                </td>
                <td className="py-2 pr-3 font-bold text-blue-900">{item.complaintId}</td>
                <td className="py-2 pr-3">{item.zone}</td>
                <td className="py-2 pr-3">{item.department}</td>
                <td className="py-2 pr-3">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!items.length ? <p className="mt-4 text-sm text-slate-600">{t("notifications_empty")}</p> : null}
      </section>
    </div>
  );
}
