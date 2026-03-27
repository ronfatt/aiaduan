"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicAppHeader } from "@/components/PublicAppHeader";
import { useI18n } from "@/lib/i18n";

function normalizeTrackingId(value: string) {
  return value.trim().toUpperCase();
}

export default function TrackLookupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = normalizeTrackingId(trackingId);
    const valid = /^TA-\d{4,}$/i.test(normalized);
    if (!valid) {
      setError(t("track_lookup_invalid"));
      return;
    }
    setError("");
    router.push(`/track/${normalized}`);
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <PublicAppHeader title="Semak Aduan" subtitle="Masukkan kod tracking anda" />
      <div className="panel">
        <h1 className="text-2xl font-extrabold text-slate-900">{t("track_lookup_title")}</h1>
        <p className="mt-2 text-sm text-slate-700">{t("track_lookup_desc")}</p>

        <div className="mt-4 grid gap-2 sm:hidden">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-800">Cara Semak</p>
            <p className="mt-1 text-sm text-slate-700">Masukkan kod seperti <span className="font-bold text-blue-900">TA-0031</span> untuk lihat status terkini.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <label className="field">
            {t("track_tracking_id")}
            <input
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder={t("track_lookup_placeholder")}
              autoComplete="off"
              className="text-base"
            />
          </label>

          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

          <button type="submit" className="btn-primary w-full sm:w-auto">
            {t("track_lookup_btn")}
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">{t("track_lookup_hint")}</p>

        <div className="mt-4">
          <Link href="/submit" className="btn-secondary inline-flex w-full justify-center sm:w-auto">
            {t("track_submit_btn")}
          </Link>
        </div>
      </div>
    </section>
  );
}
