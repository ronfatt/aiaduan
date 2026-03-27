"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function TopNav() {
  const pathname = usePathname();
  const { demoMode, setDemoMode } = useStore();
  const { locale, setLocale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const publicLinks = [
    { href: "/", label: t("nav_home") },
    { href: "/submit", label: t("nav_submit") },
    { href: "/track", label: t("nav_track") },
    { href: "/assistant", label: "WhatsApp AI" },
  ];
  const departmentLinks = [
    { href: "/admin", label: t("admin_nav_queue") },
    { href: "/field", label: t("admin_nav_field") },
    { href: "/notifications", label: t("admin_nav_notifications") },
    { href: "/reports", label: t("admin_nav_reports") },
  ];
  const leadershipLinks = [
    { href: "/insights", label: t("admin_nav_mayor") },
    { href: "/president", label: t("admin_nav_president") },
  ];
  const adminLinks = [...departmentLinks, ...leadershipLinks];
  const isAdminPage = adminLinks.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const isImmersivePublicPage =
    pathname === "/submit" || pathname === "/track" || pathname.startsWith("/track/") || pathname === "/assistant";
  const showPublicBottomBar = !isAdminPage && !isImmersivePublicPage && pathname !== "/";
  const isHomePage = pathname === "/";

  const desktopLinks = [
    ...publicLinks,
    { href: "/admin", label: "Ruang Kerja Jabatan" },
    { href: "/president", label: "Papan Pemuka Presiden" },
  ];

  return (
    <header className="border-b-2 border-[#1d3f70] bg-[#0B1F3B] text-slate-100 shadow-xl">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-extrabold text-white sm:text-2xl">e-Aduan Tawau AI</p>
          <span className="mt-1 inline-flex rounded bg-blue-900/50 px-2 py-0.5 text-xs font-bold text-cyan-200">
            Prototaip Demo
          </span>
          </div>

          <div className="flex items-center gap-2">
            {isHomePage ? (
              <label className="sm:hidden">
                <span className="sr-only">{t("nav_language")}</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "en" | "ms" | "zh")}
                  className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white backdrop-blur"
                >
                  <option value="ms" className="text-black">MS</option>
                  <option value="en" className="text-black">EN</option>
                  <option value="zh" className="text-black">中文</option>
                </select>
              </label>
            ) : (
              <Link
                href="/submit"
                className="inline-flex min-h-11 items-center rounded-xl bg-[#2D6BFF] px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-blue-900/30 sm:hidden"
              >
                {t("nav_submit")}
              </Link>
            )}
            {!isHomePage ? (
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-bold text-white sm:hidden"
                aria-expanded={menuOpen}
                aria-label="Toggle navigation"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {menuOpen ? "Tutup" : "Menu"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 hidden flex-wrap items-center gap-2 sm:flex">
          {desktopLinks.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  active ? "bg-[#2D6BFF] text-white" : "bg-white/10 text-slate-100 hover:bg-white/20"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <label className="ml-2 flex items-center gap-2 rounded border border-white/25 px-2 py-1 text-xs font-semibold text-slate-100">
            {t("nav_demo_mode")}
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => setDemoMode(!demoMode)}
              className={`relative h-6 w-12 rounded-full transition ${demoMode ? "bg-[#2D6BFF]" : "bg-slate-500"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  demoMode ? "left-6" : "left-0.5"
                }`}
              />
            </button>
          </label>

          <label className="ml-2 flex items-center gap-2 rounded border border-white/25 px-2 py-1 text-xs font-semibold text-slate-100">
            {t("nav_language")}
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "ms" | "zh")}
              className="rounded bg-white/10 px-2 py-1 text-white"
            >
              <option value="en" className="text-black">EN</option>
              <option value="ms" className="text-black">MS</option>
              <option value="zh" className="text-black">中文</option>
            </select>
          </label>

          <div className="rounded border border-white/25 bg-white/5 px-2 py-1 text-[11px]">
            <p className="font-bold uppercase tracking-wide text-cyan-100">{t("nav_ai_status")}</p>
            <p><span className="status-light status-live" />{t("nav_live")}</p>
            <p><span className="status-light status-learning" />{t("nav_learning")}</p>
            <p><span className="status-light status-monitor" />{t("nav_monitor")}</p>
          </div>
        </div>

        {menuOpen ? (
          <div className="mt-3 grid gap-2 rounded-2xl border border-white/15 bg-white/8 p-3 sm:hidden">
            <div className="grid gap-2">
              <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-200">Orang Awam</p>
              {publicLinks
                .filter((item) => item.href !== "/submit")
                .map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                        active ? "bg-[#2D6BFF] text-white" : "bg-white/10 text-slate-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
            </div>

            <div className="grid gap-2 border-t border-white/10 pt-3">
              <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-200">Ruang Kerja Jabatan</p>
              {departmentLinks.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                      active ? "bg-[#2D6BFF] text-white" : "bg-white/10 text-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="grid gap-2 border-t border-white/10 pt-3">
              <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-200">Papan Pemuka Presiden</p>
              {leadershipLinks.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                      active ? "bg-[#2D6BFF] text-white" : "bg-white/10 text-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="grid gap-2 rounded-xl border border-white/10 bg-[#09172d] p-3">
              <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-100">
                <span>{t("nav_demo_mode")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={demoMode}
                  onClick={() => setDemoMode(!demoMode)}
                  className={`relative h-6 w-12 rounded-full transition ${demoMode ? "bg-[#2D6BFF]" : "bg-slate-500"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      demoMode ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </label>

              <label className="field text-slate-100">
                {t("nav_language")}
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "en" | "ms" | "zh")}
                  className="rounded bg-white/10 px-2 py-2 text-white"
                >
                  <option value="en" className="text-black">EN</option>
                  <option value="ms" className="text-black">MS</option>
                  <option value="zh" className="text-black">中文</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>

      {showPublicBottomBar ? (
        <div className="public-bottom-bar sm:hidden">
          {publicLinks.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`public-bottom-item ${active ? "is-active" : ""}`}
              >
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      {isHomePage ? (
        <div className="sticky-landing-cta-wrap fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 sm:hidden">
          <Link
            href="/submit"
            className="sticky-landing-cta flex min-h-14 w-full items-center justify-center rounded-[18px] px-4 text-base font-extrabold text-white"
          >
            Hantar Aduan
          </Link>
        </div>
      ) : null}
    </header>
  );
}
