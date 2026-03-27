"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AdminSideNav } from "@/components/AdminSideNav";
import { useStore } from "@/lib/store";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function FieldPage() {
  const { complaints, updateFieldEvidence, updateStatus } = useStore();
  const tasks = useMemo(
    () =>
      complaints
        .filter((item) => item.status === "ASSIGNED" || item.status === "IN_PROGRESS")
        .slice(0, 20),
    [complaints],
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <AdminSideNav />
      <section className="panel">
        <h1 className="text-2xl font-extrabold text-slate-900">Field Team Mobile View</h1>
        <p className="mt-1 text-sm text-slate-600">Quick update for before/after evidence and task closure.</p>

        <div className="mt-4 grid gap-3">
          {tasks.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-bold text-blue-900">{item.id} - {item.zone}</p>
            <p className="text-sm text-slate-700">{item.rasmiJenisAduan}</p>
            <p className="text-xs text-slate-500">{item.department}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="field">
                Before Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLoadingId(item.id);
                    const url = await fileToDataUrl(file);
                    updateFieldEvidence(item.id, { beforeMediaUrl: url });
                    if (item.status === "ASSIGNED") updateStatus(item.id, "IN_PROGRESS");
                    setLoadingId(null);
                  }}
                />
              </label>
              <label className="field">
                After Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLoadingId(item.id);
                    const url = await fileToDataUrl(file);
                    updateFieldEvidence(item.id, { afterMediaUrl: url });
                    updateStatus(item.id, "DONE");
                    setLoadingId(null);
                  }}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-500">Before</p>
                {item.fieldEvidence.beforeMediaUrl ? (
                  <Image src={item.fieldEvidence.beforeMediaUrl} alt="Before evidence" width={320} height={180} unoptimized className="mt-1 h-24 w-full rounded object-cover" />
                ) : (
                  <p className="text-xs text-slate-500">No image</p>
                )}
              </div>
              <div className="rounded border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-500">After</p>
                {item.fieldEvidence.afterMediaUrl ? (
                  <Image src={item.fieldEvidence.afterMediaUrl} alt="After evidence" width={320} height={180} unoptimized className="mt-1 h-24 w-full rounded object-cover" />
                ) : (
                  <p className="text-xs text-slate-500">No image</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button className="btn-secondary" onClick={() => updateStatus(item.id, "IN_PROGRESS")}>Start Work</button>
              <button className="btn-primary" onClick={() => updateStatus(item.id, "DONE")}>Mark Done</button>
            </div>
            {loadingId === item.id ? <p className="mt-2 text-xs text-blue-700">Uploading...</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
