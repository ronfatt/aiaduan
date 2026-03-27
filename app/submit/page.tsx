"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PublicAppHeader } from "@/components/PublicAppHeader";
import { mapOfficialJenisToDepartment } from "@/lib/mapping";
import { useStore } from "@/lib/store";
import { TriageOutput, Zone } from "@/lib/types";

const zones: Zone[] = ["Bandar", "Apas", "Balung", "Kampung", "Kuhara", "Tanjung Batu"];

const mockSuggestion: TriageOutput = {
  category: "WASTE",
  urgency: "MEDIUM",
  confidence: 0.82,
  summary: "Taip aduan untuk mula analisis AI.",
  department: "Solid Waste Unit",
  eta_hours: 48,
  reasoning: "Mod demo menunggu input pengguna.",
  topCategoryTileSuggestion: "SAMPAH_KEBERSIHAN",
  rasmiJenisAduanSuggestion: "Perkhidmatan Sampah",
  officialMappingConfidence: 78,
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function urgencyLabel(urgency: TriageOutput["urgency"]) {
  if (urgency === "HIGH") return "Tinggi";
  if (urgency === "MEDIUM") return "Sederhana";
  return "Rendah";
}

function playbookByCategory(category: TriageOutput["category"]) {
  if (category === "ROAD") return ["Secure area", "Dispatch road patch unit", "Upload repair evidence"];
  if (category === "WASTE") return ["Schedule pickup", "Sanitize location", "Confirm completion photo"];
  if (category === "DRAINAGE") return ["Inspect blockage", "Deploy drainage team", "Post-rain recheck"];
  if (category === "STREETLIGHT") return ["Check power line", "Dispatch lighting unit", "Night verification"];
  if (category === "ANIMALS") return ["Send control unit", "Mitigate safety risk", "Issue closure report"];
  return ["Inspect site", "Enforcement action", "Close with report"];
}

function visionLabelsForSuggestion(suggestion: TriageOutput, hasImage: boolean) {
  if (!hasImage) return [];
  if (suggestion.category === "ROAD") return ["pothole", "road edge damage", "traffic hazard"];
  if (suggestion.category === "STREETLIGHT") return ["light pole", "night outage", "visibility risk"];
  if (suggestion.category === "DRAINAGE") return ["blocked drain", "standing water", "flood trigger"];
  if (suggestion.category === "WASTE") return ["garbage pile", "public hygiene", "odor risk"];
  if (suggestion.category === "ANIMALS") return ["stray animal", "public nuisance"];
  return ["enforcement target", "roadside obstruction"];
}

export default function SubmitPage() {
  const router = useRouter();
  const { addComplaint, demoMode, findDuplicateCandidates } = useStore();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [zone, setZone] = useState<Zone>("Bandar");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"PHOTO" | "VIDEO" | "NONE">("PHOTO");
  const [imageDataUrl, setImageDataUrl] = useState("");

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [confirmTrue, setConfirmTrue] = useState(false);
  const [suggestion, setSuggestion] = useState<TriageOutput>(mockSuggestion);
  const [aiAvailability, setAiAvailability] = useState<{
    hasOpenAIKey: boolean;
    model: string;
    liveAvailable: boolean;
  } | null>(null);
  const [triageMode, setTriageMode] = useState<"mock" | "live">(demoMode ? "mock" : "live");
  const [triageModel, setTriageModel] = useState("deterministic-mock");
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [receipt, setReceipt] = useState<{
    id: string;
    department: string;
    ownerAgency: string;
  } | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<ReturnType<typeof findDuplicateCandidates>>([]);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadAiStatus() {
      try {
        const res = await fetch("/api/ai-status", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          hasOpenAIKey: boolean;
          model: string;
          liveAvailable: boolean;
        };
        if (!active) return;
        setAiAvailability(json);
        if (!demoMode && json.liveAvailable) {
          setTriageMode("live");
          setTriageModel(json.model);
        }
      } catch {
        // Silent fallback; UI will keep demo indicators.
      }
    }

    loadAiStatus();
    return () => {
      active = false;
    };
  }, [demoMode]);

  useEffect(() => {
    const hasText = description.trim().length >= 6;
    const hasImage = Boolean(imageDataUrl);
    if (!hasText && !hasImage) {
      setSuggestion(mockSuggestion);
      setTriageMode(demoMode ? "mock" : aiAvailability?.liveAvailable ? "live" : "mock");
      setTriageModel(demoMode ? "deterministic-mock" : aiAvailability?.liveAvailable ? aiAvailability.model : "deterministic-mock");
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAi(true);
      try {
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: description.trim(),
            zone,
            demoMode,
            imageDataUrl: imageDataUrl || undefined,
            categoryHint: null,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as TriageOutput;
          setSuggestion(json);
          const modeHeader = res.headers.get("x-ai-mode");
          const modelHeader = res.headers.get("x-ai-model");
          setTriageMode(modeHeader === "live" ? "live" : "mock");
          setTriageModel(modelHeader || (modeHeader === "live" ? aiAvailability?.model || "gpt-4.1-mini" : "deterministic-mock"));
        }
      } finally {
        setLoadingAi(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [description, zone, demoMode, imageDataUrl, aiAvailability]);

  useEffect(() => {
    const candidates = findDuplicateCandidates({ zone, text: description });
    setDuplicateCandidates(candidates);
    if (mergeTargetId && !candidates.find((item) => item.id === mergeTargetId)) {
      setMergeTargetId(null);
    }
  }, [description, zone, findDuplicateCandidates, mergeTargetId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("tawau-assistant-draft");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        zone?: Zone;
        description?: string;
        suggestion?: TriageOutput;
      };
      if (parsed.zone) setZone(parsed.zone);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.suggestion) setSuggestion(parsed.suggestion);
      setCurrentStep(4);
    } catch {
      // Ignore malformed demo draft and continue with empty form.
    } finally {
      window.sessionStorage.removeItem("tawau-assistant-draft");
    }
  }, []);

  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => {
      router.push(`/track/${receipt.id}`);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [receipt, router]);

  async function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Peranti ini tidak menyokong GPS.");
      return;
    }
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
      },
      () => setError("Lokasi tidak dapat diakses. Sila pilih zon secara manual."),
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }

  function validateInput() {
    if (!description.trim() && !imageDataUrl) return "Sila masukkan penerangan atau gambar.";
    if (isAnonymous) {
      if (!phone.trim() && !email.trim()) return "Untuk aduan tanpa nama, isi telefon ATAU email.";
    } else {
      if (!name.trim()) return "Nama diperlukan.";
      if (!phone.trim()) return "Telefon diperlukan.";
    }
    if (!confirmTrue) return "Sila sahkan maklumat adalah tepat.";
    return "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitMessage("");
    const validation = validateInput();
    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage("Sedang menghantar aduan...");
      const mappedDepartment = mapOfficialJenisToDepartment(suggestion.rasmiJenisAduanSuggestion);

      const item = addComplaint({
        zone,
        description: description.trim() || "Photo/video-only complaint submission",
        mediaType,
        mediaUrl: imageDataUrl || null,
        triage: {
          ...suggestion,
          department: mappedDepartment,
          eta_hours: suggestion.eta_hours || 48,
        },
        imageAttached: Boolean(imageDataUrl),
        categoryTop: suggestion.topCategoryTileSuggestion,
        lat,
        lng,
        address: address.trim() || null,
        isAnonymous,
        name: name.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        confirmTrue,
        mergeTargetId,
        aiMode: triageMode,
        aiModelName: triageModel,
      });

      setSubmitMessage("Berjaya. Aduan anda telah direkodkan.");
      setReceipt({
        id: item.id,
        department: item.department,
        ownerAgency: item.ownerAgency,
      });
    } catch {
      setError("Aduan tidak berjaya dihantar. Sila cuba sekali lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function stepValid(step: number) {
    if (step === 1) return Boolean(description.trim() || imageDataUrl);
    if (step === 2) return Boolean(zone);
    if (step === 3) return true;
    return isAnonymous ? Boolean(phone.trim() || email.trim()) && confirmTrue : Boolean(name.trim() && phone.trim() && confirmTrue);
  }

  function goNextStep() {
    if (!stepValid(currentStep)) {
      setError(currentStep === 4 ? "Sila lengkapkan maklumat hubungan dan pengesahan." : "Sila lengkapkan langkah ini dahulu.");
      return;
    }
    setError("");
    setCurrentStep((value) => Math.min(4, value + 1));
  }

  const visionLabels = visionLabelsForSuggestion(suggestion, Boolean(imageDataUrl));
  const showLiveAi = !demoMode && triageMode === "live";
  const aiStatusLabel = demoMode
    ? "Mod demo sedang digunakan"
    : aiAvailability?.liveAvailable
      ? "AI langsung tersedia"
      : "Kunci API belum dikonfigurasi";
  const aiStatusDescription = demoMode
    ? "Tutup suis Demo Mode di atas untuk menggunakan AI sebenar."
    : aiAvailability?.liveAvailable
      ? `Model aktif: ${triageModel}`
      : "Tambah OPENAI_API_KEY dalam fail .env.local untuk mengaktifkan AI sebenar.";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PublicAppHeader title="Hantar Aduan" subtitle="Siap dalam kurang 30 saat" />

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:hidden">
        <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">Langkah Semasa</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {currentStep === 1
              ? "Terangkan masalah yang berlaku."
              : currentStep === 2
                ? "Tetapkan lokasi aduan."
                : currentStep === 3
                  ? "Tambah gambar jika ada."
                  : "Semak maklumat dan hantar aduan."}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((step) => (
            <button
              key={step}
              type="button"
              className={`rounded-xl px-2 py-2 text-xs font-extrabold ${currentStep === step ? "bg-blue-600 text-white" : currentStep > step ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
              onClick={() => setCurrentStep(step)}
            >
              Langkah {step}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="panel pb-32">
          <h2 className="hidden text-2xl font-extrabold text-slate-900 sm:block">Hantar Aduan</h2>
          <p className="mt-1 hidden text-sm text-slate-600 sm:block">Terangkan masalah, pilih lokasi, kemudian hantar.</p>

          <form ref={formRef} onSubmit={onSubmit} className="mt-4 grid gap-5">
            <section className={`rounded-lg border border-slate-200 bg-white p-4 ${currentStep === 1 ? "block" : "hidden sm:block"}`}>
              <h3 className="text-lg font-bold text-slate-900">1️⃣ Apa Berlaku?</h3>
              <label className="field mt-3">
                Apa berlaku?
                <textarea
                  rows={8}
                  className="min-h-[200px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Lampu jalan di Jalan Apas tidak menyala sejak 3 hari"
                />
              </label>
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={() =>
                  setDescription((prev) =>
                    prev || "[Voice Demo] Lampu jalan di Jalan Apas tidak menyala sejak 3 hari.",
                  )
                }
              >
                🎤 Guna Suara
              </button>
              {duplicateCandidates.length ? (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-amber-800">Kemungkinan aduan berulang ditemui</p>
                  <p className="mt-1 text-xs text-slate-700">Pilih kes sedia ada untuk merge, atau teruskan aduan baharu.</p>
                  <div className="mt-2 grid gap-2">
                    {duplicateCandidates.map((item) => (
                      <label key={item.id} className="flex cursor-pointer items-center justify-between rounded border border-amber-200 bg-white px-3 py-2 text-sm">
                        <span>
                          <span className="font-semibold text-blue-900">{item.id}</span> - {item.description.slice(0, 72)}
                        </span>
                        <input
                          type="radio"
                          name="mergeTargetId"
                          checked={mergeTargetId === item.id}
                          onChange={() => setMergeTargetId(item.id)}
                        />
                      </label>
                    ))}
                  </div>
                  <button type="button" className="btn-ghost mt-2 text-xs" onClick={() => setMergeTargetId(null)}>
                    Hantar sebagai aduan baharu
                  </button>
                </div>
              ) : null}
            </section>

            <section className={`rounded-lg border border-slate-200 bg-white p-4 ${currentStep === 2 ? "block" : "hidden sm:block"}`}>
              <h3 className="text-lg font-bold text-slate-900">2️⃣ Di Mana?</h3>
              <button type="button" className="btn-primary mt-3" onClick={useMyLocation}>
                Gunakan Lokasi Saya
              </button>
              <p className="mt-2 text-xs text-slate-500">GPS: {lat && lng ? `${lat}, ${lng}` : "Belum ditetapkan"}</p>

              <label className="field mt-3">
                Zon
                <select value={zone} onChange={(e) => setZone(e.target.value as Zone)}>
                  {zones.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="field mt-3">
                Mercu tanda (pilihan)
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Depan SK Apas"
                />
              </label>
            </section>

            <section className={`rounded-lg border border-slate-200 bg-white p-4 ${currentStep === 3 ? "block" : "hidden sm:block"}`}>
              <h3 className="text-lg font-bold text-slate-900">3️⃣ Tambah Gambar (Pilihan)</h3>
              <label className="field mt-3">
                Jenis fail
                <select value={mediaType} onChange={(e) => setMediaType(e.target.value as "PHOTO" | "VIDEO" | "NONE") }>
                  <option value="PHOTO">Foto</option>
                  <option value="VIDEO">Video</option>
                  <option value="NONE">Tiada</option>
                </select>
              </label>
              <label className="field mt-3">
                Tambah gambar / video
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setImageDataUrl("");
                      return;
                    }
                    const dataUrl = await fileToDataUrl(file);
                    setImageDataUrl(dataUrl);
                  }}
                />
              </label>
              {imageDataUrl && mediaType === "PHOTO" ? (
                <Image
                  src={imageDataUrl}
                  alt="Preview"
                  width={640}
                  height={320}
                  unoptimized
                  className="mt-3 max-h-56 w-auto rounded border border-slate-300 object-cover"
                />
              ) : null}
              {imageDataUrl ? (
                <div className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">Snap & Auto-Fill</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">AI visual check detected a likely {suggestion.rasmiJenisAduanSuggestion.toLowerCase()} case.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visionLabels.map((label) => (
                      <span key={label} className="badge border border-cyan-200 bg-white text-cyan-800">{label}</span>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Zon Dicadangkan</p>
                      <p className="text-sm font-semibold text-slate-900">{zone}</p>
                    </div>
                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Jabatan Dicadangkan</p>
                      <p className="text-sm font-semibold text-slate-900">{mapOfficialJenisToDepartment(suggestion.rasmiJenisAduanSuggestion)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary mt-3"
                    onClick={() => {
                      if (!description.trim()) {
                        setDescription(`Auto-detected from photo: ${suggestion.rasmiJenisAduanSuggestion} issue in ${zone}.`);
                      }
                      setCurrentStep(4);
                    }}
                  >
                    Guna Isian Automatik AI
                  </button>
                </div>
              ) : null}
            </section>

            <section className={`rounded-lg border border-slate-200 bg-white p-4 ${currentStep === 4 ? "block" : "hidden sm:block"}`}>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                Hantar tanpa nama
              </label>

              {!isAnonymous ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="field">Nama<input value={name} onChange={(e) => setName(e.target.value)} /></label>
                  <label className="field">Telefon<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                  <label className="field md:col-span-2">Email (pilihan)<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="field">Telefon (pilihan)<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                  <label className="field">Email (pilihan)<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
                </div>
              )}

              <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={confirmTrue} onChange={(e) => setConfirmTrue(e.target.checked)} />
                Saya sahkan maklumat ini betul.
              </label>
            </section>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
            {submitMessage ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-800">{submitMessage}</p> : null}

            <div className="flex gap-2 sm:hidden">
              {currentStep > 1 ? (
                <button type="button" className="btn-secondary flex-1" onClick={() => setCurrentStep((value) => Math.max(1, value - 1))}>
                  Kembali
                </button>
              ) : null}
              {currentStep < 4 ? (
                <button type="button" className="btn-primary flex-1" onClick={goNextStep}>
                  Seterusnya
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <aside className={`panel lg:sticky lg:top-4 lg:h-fit ${currentStep === 4 ? "block" : "hidden sm:block"}`}>
          <h3 className="text-lg font-extrabold text-slate-900">Ringkasan Kes</h3>
          <div className={`mt-3 rounded-2xl border px-3 py-3 text-sm ${
            showLiveAi
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}>
            <p className="font-extrabold">{aiStatusLabel}</p>
            <p className="mt-1 text-xs">{aiStatusDescription}</p>
          </div>
          <p className="mt-3 text-sm text-emerald-700">✔ Sistem telah cadangkan kategori rasmi</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <p><span className="font-semibold">Kategori Rasmi:</span> {loadingAi ? "Menganalisis..." : suggestion.rasmiJenisAduanSuggestion}</p>
            <p><span className="font-semibold">Jabatan:</span> {mapOfficialJenisToDepartment(suggestion.rasmiJenisAduanSuggestion)}</p>
            <p><span className="font-semibold">Tahap Keutamaan:</span> {urgencyLabel(suggestion.urgency)}</p>
            <p><span className="font-semibold">Anggaran Masa:</span> {suggestion.eta_hours || 48} jam</p>
            <p><span className="font-semibold">Keyakinan AI:</span> {Math.round(suggestion.confidence * 100)}%</p>
            <p><span className="font-semibold">Sumber Analisis:</span> {showLiveAi ? "OpenAI API" : "Peraturan demo tempatan"}</p>
          </div>

          <details className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Lihat Butiran AI</summary>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              <p><span className="font-semibold">Ringkasan AI:</span> {suggestion.summary}</p>
              <p><span className="font-semibold">Sebab:</span> {suggestion.reasoning}</p>
              <p><span className="font-semibold">Keyakinan Pemetaan:</span> {Math.round(suggestion.officialMappingConfidence)}%</p>
              <p className="mt-2 font-semibold">Cadangan Tindakan:</p>
              <ul className="list-disc pl-5">
                {playbookByCategory(suggestion.category).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </details>
        </aside>
      </div>

      <div className="submit-bottom-bar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:mt-3 md:border-0 md:bg-transparent md:p-0">
        {currentStep === 4 ? (
          <p className="mb-2 text-center text-xs font-semibold text-slate-500 md:hidden">
            Langkah terakhir. Tekan butang di bawah.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (currentStep < 4) {
              goNextStep();
              return;
            }
            formRef.current?.requestSubmit();
          }}
          className="w-full rounded-[16px] border border-blue-700 bg-gradient-to-b from-blue-600 to-blue-800 py-4 text-xl font-extrabold text-white shadow-lg hover:shadow-blue-300/40 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? "Menghantar..." : currentStep < 4 ? "Seterusnya" : "📩 HANTAR ADUAN"}
        </button>
      </div>

      {receipt ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 shadow-2xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-emerald-700">Aduan Berjaya</p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">Aduan berjaya dihantar</h3>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Kod Jejak</p>
              <p className="mt-1 text-3xl font-black text-blue-900">{receipt.id}</p>
              <p className="mt-3 text-sm text-slate-700"><span className="font-semibold">Jabatan:</span> {receipt.department}</p>
              <p className="text-sm text-slate-700"><span className="font-semibold">Agensi:</span> {receipt.ownerAgency}</p>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Sila simpan kod ini untuk semakan status. Kami akan membawa anda ke halaman jejak aduan sekarang.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setReceipt(null)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => router.push(`/track/${receipt.id}`)}
              >
                Jejak Aduan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
