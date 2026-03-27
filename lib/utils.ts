import { Complaint } from "@/lib/types";

export const DATELINE_HOURS = 72;

export function urgencySlaHours(level: Complaint["aiUrgency"]) {
  if (level === "HIGH") return 24;
  if (level === "MEDIUM") return 72;
  return 168;
}

export function timeLeftText(item: Complaint) {
  if (item.status === "DONE") return "Completed";
  const due = new Date(item.createdAt).getTime() + urgencySlaHours(item.aiUrgency) * 3600 * 1000;
  const diffH = Math.round((due - Date.now()) / (3600 * 1000));
  if (diffH < 0) return `${Math.abs(diffH)}h overdue`;
  return `${diffH}h left`;
}

export function isOverdue(item: Complaint) {
  if (item.status === "DONE") return false;
  const due = new Date(item.createdAt).getTime() + urgencySlaHours(item.aiUrgency) * 3600 * 1000;
  return due < Date.now();
}

export function isPastDateline(item: Complaint) {
  if (item.status === "DONE") return false;
  return new Date(item.datelineAt).getTime() < Date.now();
}

export function datelineCountdown(item: Complaint, nowMs: number) {
  if (item.status === "DONE") return "Completed";
  const diff = Math.round((new Date(item.datelineAt).getTime() - nowMs) / 1000);
  if (diff < 0) return `${Math.abs(diff)}s overdue`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}h ${m}m ${s}s`;
}

export function presidentReminderNeeded(item: Complaint) {
  return isPastDateline(item) && item.status !== "DONE";
}

export function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}
