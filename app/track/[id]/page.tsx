"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PublicAppHeader } from "@/components/PublicAppHeader";
import { getLiveCaseTracking } from "@/lib/aiIntel";
import { useStore } from "@/lib/store";
import { OwnerAgency } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function citizenStage(status: string) {
  if (status === "DONE") return 3;
  if (status === "ASSIGNED" || status === "IN_PROGRESS") return 2;
  return 1;
}

function agencyLabel(agency: OwnerAgency) {
  if (agency === "MPT") return "Majlis Perbandaran Tawau";
  if (agency === "JKR") return "JKR";
  if (agency === "JABATAN_AIR") return "Jabatan Air";
  if (agency === "SESB") return "SESB";
  if (agency === "POLIS") return "Polis";
  if (agency === "BOMBA") return "Bomba";
  return "Agensi Lain";
}

export default function TrackPage() {
  const params = useParams<{ id: string }>();
  const { getById, feedbacks, submitFeedback, reopenComplaint } = useStore();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [comment, setComment] = useState("");
  const complaint = getById(params.id);

  if (!complaint) {
    return (
      <section className="panel">
        <h2 className="text-xl font-extrabold text-slate-900">Kod Jejak tidak ditemui</h2>
        <p className="mt-2 text-slate-700">Tiada aduan dengan ID {params.id}.</p>
        <Link href="/submit" className="btn-primary mt-4 inline-flex">
          Hantar Aduan
        </Link>
      </section>
    );
  }

  const stage = citizenStage(complaint.status);
  const feedback = feedbacks.find((item) => item.complaintId === complaint.id) ?? null;
  const liveTracking = getLiveCaseTracking(complaint);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 pb-6">
      <PublicAppHeader title="Status Aduan" subtitle={complaint.id} />

      <section className="panel border-emerald-200 bg-emerald-50/70">
        <h2 className="text-2xl font-extrabold text-emerald-700">✔ Aduan Diterima</h2>
        <p className="mt-2 text-sm text-slate-700">Aduan anda telah diterima dan dihantar kepada jabatan berkaitan.</p>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-semibold">Kod Jejak:</span> {complaint.id}</p>
          <p><span className="font-semibold">Kategori Rasmi:</span> {complaint.rasmiJenisAduan}</p>
          <p><span className="font-semibold">Jabatan:</span> {complaint.department}</p>
          <p><span className="font-semibold">Anggaran Masa:</span> {complaint.aiEtaHours || 48} jam</p>
          <p><span className="font-semibold">Eskalasi SLA:</span> {complaint.slaEscalationLevel}</p>
        </div>

        <details className="mt-3 rounded border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Lihat Analisis AI</summary>
          <div className="mt-2 grid gap-1 text-sm text-slate-700">
            <p><span className="font-semibold">Kategori AI:</span> {complaint.aiCategory}</p>
            <p><span className="font-semibold">Keutamaan AI:</span> {complaint.aiUrgency}</p>
            <p><span className="font-semibold">Keyakinan AI:</span> {Math.round(complaint.aiConfidence * 100)}%</p>
            <p><span className="font-semibold">Ringkasan AI:</span> {complaint.aiSummary}</p>
            <p><span className="font-semibold">Sebab:</span> {complaint.aiReasoning}</p>
          </div>
        </details>
      </section>

      <section className="panel border-blue-200 bg-blue-50/70">
        <h3 className="text-lg font-bold text-slate-900">Arah Tindakan</h3>
        {complaint.ownerAgency === "MPT" ? (
          <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Kes ini akan diuruskan oleh jabatan dalaman berikut:</p>
            <p className="mt-2 text-xl font-extrabold text-blue-900">{complaint.department}</p>
            <p className="mt-2 text-sm text-slate-600">
              Pasukan kami telah menerima kes ini dan akan meneruskan tindakan susulan mengikut keutamaan aduan.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Kes ini dikenal pasti di bawah agensi berikut:</p>
            <p className="mt-2 text-xl font-extrabold text-amber-700">{agencyLabel(complaint.ownerAgency)}</p>
            <p className="mt-2 text-sm text-slate-600">
              Aduan ini akan disediakan untuk dirujuk kepada agensi berkaitan, sementara rekod anda kekal boleh dijejak melalui kod ini.
            </p>
            {complaint.forwardPackage ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Rujukan semasa: {complaint.forwardPackage.subject}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="panel border-slate-200 bg-white">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Perjalanan Aduan</h3>
            <p className="mt-1 text-sm text-slate-600">
              Lihat kedudukan tindakan terkini untuk kes ini.
            </p>
          </div>
          <span className="badge border border-blue-200 bg-blue-50 text-blue-700">
            {liveTracking.progressPct}% siap
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${liveTracking.progressPct}%` }}
          />
        </div>

        <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">Status Terkini</p>
          <p className="mt-1 text-sm font-semibold text-blue-900">{liveTracking.driverStyleLine}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Kemas kini seterusnya dalam {liveTracking.nextUpdateHours}j
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {liveTracking.stages.map((item, index) => {
            const active = index === liveTracking.currentIndex;
            const done = index < liveTracking.currentIndex || (complaint.status === "DONE" && index <= liveTracking.currentIndex);
            return (
              <article
                key={item.key}
                className={`rounded-2xl border p-4 ${
                  active
                    ? "border-blue-300 bg-blue-50 shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
                    : done
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Langkah {index + 1}
                </p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3 className="text-lg font-bold text-slate-900">Status Aduan</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
          <div className={`rounded-2xl px-3 py-3 text-center text-xs font-extrabold ${stage >= 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>Diterima</div>
          <div className={`rounded-2xl px-3 py-3 text-center text-xs font-extrabold ${stage >= 2 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>Tindakan</div>
          <div className={`rounded-2xl px-3 py-3 text-center text-xs font-extrabold ${stage >= 3 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>Selesai</div>
        </div>
        <ol className="mt-4 hidden gap-3 sm:grid">
          <li className={`rounded border p-3 ${stage >= 1 ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-sm font-bold">1) Diterima</p>
            <p className="text-xs text-slate-600">Aduan direkod dalam sistem.</p>
          </li>
          <li className={`rounded border p-3 ${stage >= 2 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-sm font-bold">2) Dalam Tindakan</p>
            <p className="text-xs text-slate-600">Jabatan sedang mengambil tindakan.</p>
          </li>
          <li className={`rounded border p-3 ${stage >= 3 ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-sm font-bold">3) Selesai</p>
            <p className="text-xs text-slate-600">Kes telah diselesaikan.</p>
          </li>
        </ol>

        <p className="mt-4 text-xs text-slate-500">Diterima pada: {formatDate(complaint.createdAt)}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/submit" className="btn-secondary text-center">Hantar Lagi</Link>
          <Link href="/" className="btn-primary text-center">Kembali ke Laman Utama</Link>
          {complaint.status === "DONE" ? (
            <button className="btn-secondary w-full sm:w-auto" onClick={() => reopenComplaint(complaint.id, "Citizen requested reopen from tracking page.")}>
              Buka Semula Kes
            </button>
          ) : null}
        </div>
      </section>

      {complaint.status === "DONE" ? (
        <section className="panel">
          <h3 className="text-lg font-bold text-slate-900">Maklum Balas</h3>
          {feedback ? (
            <div className="mt-2 text-sm">
              <p><span className="font-semibold">Puas Hati:</span> {feedback.puasHati ? "Ya" : "Tidak"}</p>
              <p><span className="font-semibold">Rating:</span> {feedback.rating}/5</p>
              <p><span className="font-semibold">Komen:</span> {feedback.comment ?? "-"}</p>
            </div>
          ) : (
            <form
              className="mt-3 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitFeedback({
                  complaintId: complaint.id,
                  puasHati: rating >= 4,
                  rating,
                  comment: comment || null,
                });
              }}
            >
              <label className="field">
                Penilaian (1-5)
                <select value={rating} onChange={(e) => setRating(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </label>
              <label className="field">
                Komen (pilihan)
                <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              <button type="submit" className="btn-primary w-full sm:w-auto">Hantar Maklum Balas</button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
