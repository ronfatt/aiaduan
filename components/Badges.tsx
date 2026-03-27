import { Category, ComplaintStatus, Urgency } from "@/lib/types";

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = {
    LOW: "bg-emerald-100 text-emerald-800 border-emerald-200",
    MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
    HIGH: "bg-red-100 text-red-800 border-red-200",
  }[urgency];
  return <span className={`badge border ${c}`}>{urgency}</span>;
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const c = {
    RECEIVED: "bg-blue-100 text-blue-800 border-blue-200",
    ASSIGNED: "bg-indigo-100 text-indigo-800 border-indigo-200",
    IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
    DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  }[status];
  return <span className={`badge border ${c}`}>{status.replace("_", " ")}</span>;
}

export function CategoryBadge({ category }: { category: Category }) {
  return <span className="badge border border-slate-300 bg-slate-100 text-slate-700">{category}</span>;
}
