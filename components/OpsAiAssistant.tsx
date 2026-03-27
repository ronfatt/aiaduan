"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Complaint } from "@/lib/types";
import { getOpsAssistantReply, OpsAssistantScope, toCompactAssistantCases } from "@/lib/opsAssistant";

export function OpsAiAssistant({
  scope,
  complaints,
}: {
  scope: OpsAssistantScope;
  complaints: Complaint[];
}) {
  const presets = useMemo(
    () =>
      scope === "department"
        ? [
            "Apa yang belum selesai?",
            "Kenapa kes tertinggi belum selesai?",
            "Apa tindakan seterusnya hari ini?",
          ]
        : [
            "Apakah keadaan semasa bandar?",
            "Isu paling kritikal apa sekarang?",
            "Keputusan apa yang perlu dibuat hari ini?",
          ],
    [scope],
  );
  const { demoMode } = useStore();

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState(() => getOpsAssistantReply(scope, presets[0], complaints));
  const [aiMode, setAiMode] = useState<"live" | "mock">(demoMode ? "mock" : "live");
  const [aiModel, setAiModel] = useState<string>(demoMode ? "deterministic-ops-assistant" : "OpenAI");

  async function ask(nextQuestion: string) {
    setQuestion(nextQuestion);
    setLoading(true);
    try {
      const res = await fetch("/api/ops-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          question: nextQuestion,
          complaints: toCompactAssistantCases(complaints),
          demoMode,
        }),
      });

      if (!res.ok) {
        throw new Error("Assistant request failed");
      }

      const json = (await res.json()) as ReturnType<typeof getOpsAssistantReply>;
      setReply(json);
      setAiMode(res.headers.get("x-ai-mode") === "live" ? "live" : "mock");
      setAiModel(res.headers.get("x-ai-model") || "deterministic-ops-assistant");
    } catch {
      setReply(getOpsAssistantReply(scope, nextQuestion, complaints));
      setAiMode("mock");
      setAiModel("deterministic-ops-assistant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel panel-ai ops-assistant-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-200">
            {scope === "department" ? "AI 管家 / AI Penjaga Operasi" : "AI 秘书 / AI Setiausaha Presiden"}
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            {scope === "department" ? "Tanya AI tentang barisan kerja" : "Tanya AI tentang keadaan bandar"}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {scope === "department"
              ? "AI akan ringkaskan kes belum selesai, punca kelewatan, dan tindakan seterusnya."
              : "AI akan ringkaskan risiko bandar, isu kritikal, dan keputusan yang perlu diberi perhatian segera."}
          </p>
        </div>
        <div className="ops-assistant-status">
          <span className="status-dot" />
          <span>{loading ? "Menganalisis data semasa..." : aiMode === "live" ? `OpenAI aktif: ${aiModel}` : "Fallback pintar tempatan aktif"}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="ops-assistant-chip"
            onClick={() => ask(preset)}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
          <label className="field text-slate-200">
            Soalan kepada AI
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={scope === "department" ? "Contoh: Apa yang belum selesai?" : "Contoh: Isu paling kritikal apa sekarang?"}
            />
          </label>
          <button
            type="button"
            className="btn-primary mt-3"
            onClick={() => ask(question || presets[0])}
          >
            Tanya AI
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-400/15 bg-white/8 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">AI Jawapan</p>
          {loading ? (
            <div className="mt-3">
              <div className="scan-line" />
              <p className="mt-3 text-sm text-slate-200">AI sedang menyemak status, SLA, dan tindakan seterusnya...</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 text-sm">
              <div>
                <p className="text-lg font-black text-white">{reply.title}</p>
                <p className="mt-1 text-slate-300">{reply.summary}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
                <ul className="grid gap-2 text-slate-100">
                  {reply.bullets.map((item) => (
                    <li key={item} className="ops-assistant-bullet">{item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">{reply.followup}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
