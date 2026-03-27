"use client";

import { useRouter } from "next/navigation";

type PublicAppHeaderProps = {
  title: string;
  subtitle?: string;
};

export function PublicAppHeader({ title, subtitle }: PublicAppHeaderProps) {
  const router = useRouter();

  return (
    <div className="public-app-header sm:hidden">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm"
      >
        Kembali
      </button>
      <div className="min-w-0">
        <p className="truncate text-base font-extrabold text-slate-900">{title}</p>
        {subtitle ? <p className="truncate text-xs font-semibold text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}
