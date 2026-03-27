import {
  getAdminAiAction,
  getForecast,
  getResourceAllocationPlan,
  getWeeklyMayorBrief,
} from "@/lib/aiIntel";
import { Complaint } from "@/lib/types";
import { isOverdue } from "@/lib/utils";

export type OpsAssistantScope = "department" | "president";

export type OpsAssistantReply = {
  title: string;
  summary: string;
  bullets: string[];
  followup: string;
};

export type OpsAssistantCompactCase = Pick<
  Complaint,
  | "id"
  | "zone"
  | "aiCategory"
  | "rasmiJenisAduan"
  | "status"
  | "department"
  | "aiUrgency"
  | "aiConfidence"
  | "aiSummary"
  | "ownerAgency"
  | "slaEscalationLevel"
  | "rasmiPegawaiBertanggungjawab"
  | "assignedOfficerRole"
  | "predictedEtaHours"
  | "predictedEtaReason"
  | "fieldEvidence"
  | "forwardPackage"
  | "rasmiMaklumatTindakan"
>;

function unresolvedComplaints(complaints: Complaint[]) {
  return complaints
    .filter((item) => item.status !== "DONE")
    .map((item) => ({ item, ai: getAdminAiAction(item) }))
    .sort((a, b) => b.ai.riskScore - a.ai.riskScore);
}

function findCaseFromQuestion(question: string, complaints: Complaint[]) {
  const match = question.match(/ta-\d{4}/i);
  if (!match) return null;
  return complaints.find((item) => item.id.toLowerCase() === match[0].toLowerCase()) ?? null;
}

function getCaseReasons(item: Complaint) {
  const reasons: string[] = [];
  if (item.status === "RECEIVED") reasons.push("Kes masih di peringkat penerimaan dan belum ditugaskan kepada pasukan lapangan.");
  if (!item.rasmiPegawaiBertanggungjawab) reasons.push("Pegawai bertanggungjawab masih belum ditetapkan.");
  if (!item.rasmiMaklumatTindakan.tindakan) reasons.push("Maklumat tindakan rasmi masih belum diisi oleh jabatan.");
  if (item.ownerAgency !== "MPT") reasons.push(`Kes memerlukan penyelarasan dengan agensi luar: ${item.ownerAgency}.`);
  if (item.status === "IN_PROGRESS" && !item.fieldEvidence.afterMediaUrl) reasons.push("Bukti selepas tindakan masih belum dimuat naik oleh pasukan lapangan.");
  if (isOverdue(item)) reasons.push("Kes telah melepasi tarikh akhir SLA dan memerlukan eskalasi segera.");
  if (!reasons.length) reasons.push("Kes masih berjalan mengikut aliran kerja semasa tetapi menunggu kemas kini seterusnya.");
  return reasons;
}

function getCaseNextActions(item: Complaint) {
  const ai = getAdminAiAction(item);
  const actions: string[] = [];
  if (!item.rasmiPegawaiBertanggungjawab) actions.push("Tetapkan pegawai bertanggungjawab sekarang.");
  if (item.status === "RECEIVED") actions.push(`Tugaskan kes kepada ${ai.team} dalam masa ${ai.dispatchWithinHours} jam.`);
  if (item.status === "ASSIGNED") actions.push("Pastikan pasukan menerima tugasan dan rekod tarikh maklumbalas.");
  if (item.status === "IN_PROGRESS") actions.push("Dapatkan bukti selepas tindakan dan kemas kini status rasmi.");
  if (item.ownerAgency !== "MPT" && item.forwardPackage) actions.push(`Susuli pakej rujukan kepada ${item.forwardPackage.toAgency}.`);
  if (isOverdue(item)) actions.push("Maklumkan penyelia / kepimpinan kerana kes telah melepasi SLA.");
  if (!actions.length) actions.push("Teruskan pemantauan sehingga kerja disahkan selesai.");
  return actions;
}

function answerUnfinished(complaints: Complaint[], scope: OpsAssistantScope): OpsAssistantReply {
  const unresolved = unresolvedComplaints(complaints);
  const overdue = unresolved.filter(({ item }) => isOverdue(item));
  const top = unresolved.slice(0, scope === "department" ? 5 : 4);

  return {
    title: scope === "department" ? "Kes belum selesai" : "Status belum selesai semasa",
    summary:
      scope === "department"
        ? `Terdapat ${unresolved.length} kes yang masih belum selesai. ${overdue.length} daripadanya sudah melepasi SLA.`
        : `Pada masa ini terdapat ${unresolved.length} kes aktif, dengan ${overdue.length} memerlukan perhatian kepimpinan segera.`,
    bullets: top.map(({ item, ai }) => `${item.id} - ${item.rasmiJenisAduan} di ${item.zone}, status ${item.status}, risiko ${ai.riskScore}.`),
    followup:
      scope === "department"
        ? "Tanya: kenapa TA-xxxx belum selesai? atau apa tindakan seterusnya?"
        : "Tanya: isu paling kritikal apa? atau keputusan apa yang perlu dibuat hari ini?",
  };
}

function answerWhy(question: string, complaints: Complaint[]): OpsAssistantReply {
  const unresolved = unresolvedComplaints(complaints);
  const item = findCaseFromQuestion(question, complaints) ?? unresolved[0]?.item ?? null;

  if (!item) {
    return {
      title: "Tiada kes untuk dianalisis",
      summary: "Sistem tidak menemui kes aktif yang boleh dihuraikan sekarang.",
      bullets: [],
      followup: "Cuba tanya semula dengan kod kes seperti TA-0007.",
    };
  }

  return {
    title: `Mengapa ${item.id} belum selesai`,
    summary: `${item.id} masih di bawah ${item.department} dengan status ${item.status}. Sistem melihat beberapa punca utama kelewatan.`,
    bullets: [...getCaseReasons(item), ...getCaseNextActions(item).slice(0, 2)],
    followup: `Tanya: apa tindakan seterusnya untuk ${item.id}?`,
  };
}

function answerNextActions(question: string, complaints: Complaint[], scope: OpsAssistantScope): OpsAssistantReply {
  const item = findCaseFromQuestion(question, complaints) ?? unresolvedComplaints(complaints)[0]?.item ?? null;

  if (item) {
    return {
      title: `Tindakan seterusnya untuk ${item.id}`,
      summary: `AI mencadangkan tindakan operasi berikut untuk mempercepatkan kes ${item.id}.`,
      bullets: getCaseNextActions(item),
      followup: "Tanya: kenapa kes ini lewat? atau apa lagi yang belum selesai?",
    };
  }

  const allocation = getResourceAllocationPlan(complaints);
  return {
    title: scope === "department" ? "Tindakan operasi seterusnya" : "Cadangan keputusan seterusnya",
    summary:
      scope === "department"
        ? `Jabatan yang paling perlu diberi tumpuan ialah ${allocation.primaryDepartment}.`
        : `Keputusan paling penting sekarang ialah menstabilkan ${allocation.primaryDepartment}.`,
    bullets: allocation.interventionPlan,
    followup: "Tanya: apa yang belum selesai? atau isu paling kritikal apa?",
  };
}

function answerPresidentSummary(complaints: Complaint[]): OpsAssistantReply {
  const feedbacks = complaints
    .filter((item) => item.status === "DONE")
    .slice(0, 5)
    .map(() => ({ rating: 4, puasHati: true }));
  const weekly = getWeeklyMayorBrief(complaints, feedbacks);
  const forecast = getForecast(complaints);
  const allocation = getResourceAllocationPlan(complaints);

  return {
    title: "Ringkasan semasa untuk Presiden",
    summary: weekly.headline,
    bullets: [
      weekly.operationalNote,
      weekly.publicNote,
      `Zon yang perlu diberi perhatian segera: ${forecast.highRiskZone}.`,
      `Cadangan AI: beri intervensi kepada ${allocation.primaryDepartment}.`,
    ],
    followup: "Tanya: isu paling kritikal apa? atau keputusan apa yang perlu dibuat hari ini?",
  };
}

export function getOpsAssistantReply(
  scope: OpsAssistantScope,
  question: string,
  complaints: Complaint[],
): OpsAssistantReply {
  const q = question.trim().toLowerCase();

  if (!q) {
    return scope === "department"
      ? answerUnfinished(complaints, scope)
      : answerPresidentSummary(complaints);
  }

  if (/(belum selesai|未完成|outstanding|unfinished|not complete|尚未完成)/i.test(q)) {
    return answerUnfinished(complaints, scope);
  }

  if (/(kenapa|why|mengapa|为什么)/i.test(q)) {
    return answerWhy(q, complaints);
  }

  if (/(next action|tindakan seterusnya|apa tindakan|langkah seterusnya|下一步|apa perlu dibuat|what should)/i.test(q)) {
    return answerNextActions(q, complaints, scope);
  }

  if (scope === "president" && /(keadaan semasa|ringkasan|current situation|summary|现况|整体情况|keputusan)/i.test(q)) {
    return answerPresidentSummary(complaints);
  }

  if (scope === "president" && /(kritikal|critical|urgent|paling penting|highest risk|高风险)/i.test(q)) {
    return answerUnfinished(complaints, "president");
  }

  return scope === "department"
    ? answerNextActions(q, complaints, scope)
    : answerPresidentSummary(complaints);
}

export function toCompactAssistantCases(complaints: Complaint[]): OpsAssistantCompactCase[] {
  return complaints.map((item) => ({
    id: item.id,
    zone: item.zone,
    aiCategory: item.aiCategory,
    rasmiJenisAduan: item.rasmiJenisAduan,
    status: item.status,
    department: item.department,
    aiUrgency: item.aiUrgency,
    aiConfidence: item.aiConfidence,
    aiSummary: item.aiSummary,
    ownerAgency: item.ownerAgency,
    slaEscalationLevel: item.slaEscalationLevel,
    rasmiPegawaiBertanggungjawab: item.rasmiPegawaiBertanggungjawab,
    assignedOfficerRole: item.assignedOfficerRole,
    predictedEtaHours: item.predictedEtaHours,
    predictedEtaReason: item.predictedEtaReason,
    fieldEvidence: item.fieldEvidence,
    forwardPackage: item.forwardPackage,
    rasmiMaklumatTindakan: item.rasmiMaklumatTindakan,
  }));
}
