"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const groups = [
  {
    title: "Department Workspace",
    items: [
      { href: "/admin", key: "admin_nav_queue" },
      { href: "/field", key: "admin_nav_field" },
      { href: "/notifications", key: "admin_nav_notifications" },
      { href: "/reports", key: "admin_nav_reports" },
    ],
  },
  {
    title: "Leadership Tools",
    items: [
      { href: "/insights", key: "admin_nav_mayor" },
      { href: "/president", key: "admin_nav_president" },
    ],
  },
] as const;

export function AdminSideNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="rounded-lg border border-slate-300 bg-white p-3">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{t("admin_nav_title")}</p>
      <div className="grid gap-4">
        {groups.map((group) => (
          <div key={group.title} className="grid gap-2">
            <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-2 text-sm font-semibold ${
                    active ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
