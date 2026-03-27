"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PublicAppHeader } from "@/components/PublicAppHeader";
import { mapOfficialJenisToDepartment } from "@/lib/mapping";
import { triageMock } from "@/lib/triage";
import { Zone } from "@/lib/types";

type DemoScenario = {
  id: string;
  title: string;
  zone: Zone;
  language: string;
  transcript: string;
  userLine: string;
};

const scenarios: DemoScenario[] = [
  {
    id: "streetlight",
    title: "Voice Note: Streetlight",
    zone: "Apas",
    language: "Bahasa Melayu",
    transcript: "Lampu jalan di Jalan Apas tidak menyala sejak 3 hari dan kawasan sangat gelap waktu malam.",
    userLine: "Voice note 0:18",
  },
  {
    id: "drain",
    title: "WhatsApp Text: Drainage",
    zone: "Balung",
    language: "Bahasa Melayu",
    transcript: "Longkang tersumbat dekat Balung, air naik bila hujan lebat dan masuk halaman rumah.",
    userLine: "Longkang tersumbat dekat Balung...",
  },
  {
    id: "waste",
    title: "Chinese Voice: Waste",
    zone: "Bandar",
    language: "Chinese",
    transcript: "Bandar 这边有很多垃圾，已经两天没有清理，味道很重。",
    userLine: "Voice note 0:11",
  },
];

export default function AssistantDemoPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(scenarios[0].id);
  const selected = scenarios.find((item) => item.id === selectedId) ?? scenarios[0];

  const triage = useMemo(
    () =>
      triageMock({
        text: selected.transcript,
        zone: selected.zone,
      }),
    [selected],
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PublicAppHeader title="WhatsApp Aduan" subtitle="Hantar mesej atau voice note" />

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Chat Intake Demo</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Aduan melalui WhatsApp</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Hantar mesej atau voice note. Sistem akan baca, faham, dan sediakan aduan secara automatik.
            </p>
          </div>
          <Link href="/submit" className="btn-secondary w-full justify-center sm:w-auto">
            Guna Borang Biasa
          </Link>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-bold ${
                selectedId === scenario.id
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700"
              }`}
              onClick={() => setSelectedId(scenario.id)}
            >
              {scenario.title}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel overflow-hidden bg-[#e7f7ec]">
          <div className="rounded-3xl border border-emerald-200 bg-white">
            <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-600 px-4 py-3 text-white">
              <div>
                <p className="text-sm font-extrabold">e-Aduan Tawau Bot</p>
                <p className="text-xs font-medium text-emerald-100">WhatsApp / Voice Intake</p>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">CHAT DEMO</span>
            </div>

            <div className="grid gap-3 bg-[#f3fbf5] p-4">
              <div className="justify-self-end rounded-2xl rounded-br-md bg-emerald-500 px-4 py-3 text-sm font-semibold text-white">
                {selected.userLine}
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-slate-900">AI Transcript</p>
                <p className="mt-1">{selected.transcript}</p>
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-bold text-blue-900">Balasan Bot</p>
                <p className="mt-1">
                  Aduan diterima. Sistem AI sedang mengelaskan isu, mengenal pasti zon {selected.zone}, dan menyediakan routing kepada jabatan berkaitan.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <article className="panel border-cyan-200 bg-cyan-50/70">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-800">Ringkasan Bot</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p><span className="font-semibold">Detected Language:</span> {selected.language}</p>
              <p><span className="font-semibold">Transcript Confidence:</span> 94%</p>
              <p><span className="font-semibold">Suggested Zone:</span> {selected.zone}</p>
              <p><span className="font-semibold">Official Category:</span> {triage.rasmiJenisAduanSuggestion}</p>
              <p><span className="font-semibold">Department:</span> {mapOfficialJenisToDepartment(triage.rasmiJenisAduanSuggestion)}</p>
              <p><span className="font-semibold">Urgency:</span> {triage.urgency}</p>
              <p><span className="font-semibold">ETA:</span> {triage.eta_hours}h</p>
            </div>
          </article>

          <article className="panel">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Draf Aduan</p>
            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">Lihat data aduan</summary>
              <pre className="mt-3 overflow-auto text-xs text-slate-700">
{JSON.stringify(
  {
    channel: "WhatsApp Voice Bot",
    zone: selected.zone,
    transcript: selected.transcript,
    aiCategory: triage.category,
    rasmiJenisAduan: triage.rasmiJenisAduanSuggestion,
    department: mapOfficialJenisToDepartment(triage.rasmiJenisAduanSuggestion),
    etaHours: triage.eta_hours,
  },
  null,
  2,
)}
              </pre>
            </details>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  window.sessionStorage.setItem(
                    "tawau-assistant-draft",
                    JSON.stringify({
                      zone: selected.zone,
                      description: selected.transcript,
                      suggestion: triage,
                    }),
                  );
                  router.push("/submit");
                }}
              >
                Buka Draf Aduan
              </button>
              <Link href="/track" className="btn-secondary text-center">
                Semak Status
              </Link>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
