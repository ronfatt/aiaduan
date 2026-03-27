import { mapStatusToRasmiStatus, mapTriageToOfficial, mapOfficialJenisToDepartment } from "@/lib/mapping";
import {
  ComplaintActionLog,
  CitizenCategoryTop,
  Complaint,
  ComplaintStatus,
  Feedback,
  OwnerAgency,
  TimelineEvent,
  TriageOutput,
  Zone,
} from "@/lib/types";

const base = new Date("2026-02-16T08:00:00.000Z");

const zoneCoords: Record<Zone, { lat: number; lng: number }> = {
  Bandar: { lat: 4.2498, lng: 117.8871 },
  Apas: { lat: 4.2238, lng: 117.9232 },
  Balung: { lat: 4.1816, lng: 117.9812 },
  Kampung: { lat: 4.2913, lng: 117.8661 },
  Kuhara: { lat: 4.2587, lng: 117.9111 },
  "Tanjung Batu": { lat: 4.2744, lng: 117.8949 },
};

function timeShift(daysAgo: number, hours: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(d.getUTCHours() - hours);
  return d.toISOString();
}

function timeline(createdAt: string, status: ComplaintStatus) {
  const events: TimelineEvent[] = [
    { status: "RECEIVED" as const, at: createdAt, note: "Complaint received from citizen portal" },
  ];

  if (status === "ASSIGNED" || status === "IN_PROGRESS" || status === "DONE") {
    events.push({
      status: "ASSIGNED" as const,
      at: new Date(new Date(createdAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
      note: "Case assigned to department officer",
    });
  }

  if (status === "IN_PROGRESS" || status === "DONE") {
    events.push({
      status: "IN_PROGRESS" as const,
      at: new Date(new Date(createdAt).getTime() + 20 * 60 * 60 * 1000).toISOString(),
      note: "Field team started intervention",
    });
  }

  if (status === "DONE") {
    events.push({
      status: "DONE" as const,
      at: new Date(new Date(createdAt).getTime() + 46 * 60 * 60 * 1000).toISOString(),
      note: "Issue resolved and verified",
    });
  }

  return events;
}

const descriptions = [
  "Large pothole near traffic light, many motorcycles avoiding suddenly.",
  "Garbage bins overflowing behind shop row with strong smell since yesterday.",
  "Longkang blocked, rainwater entering house compound during heavy rain.",
  "Streetlight not working for 3 poles near pedestrian crossing.",
  "Stray dogs chasing children near playground every evening.",
  "Unlicensed stall blocking roadside and causing traffic jam at peak hours.",
  "Road shoulder collapsed near drain edge and dangerous for cars.",
  "Illegal dumping site growing beside market area and attracting pests.",
  "Drain grating broken and water stagnant with mosquito breeding concerns.",
  "Night area too dark due to lamp outage near junction.",
];

const templates = [
  { aiCategory: "ROAD", aiUrgency: "HIGH", status: "IN_PROGRESS", tile: "JALAN_INFRA" },
  { aiCategory: "WASTE", aiUrgency: "MEDIUM", status: "ASSIGNED", tile: "SAMPAH_KEBERSIHAN" },
  { aiCategory: "DRAINAGE", aiUrgency: "HIGH", status: "RECEIVED", tile: "LONGKANG_POKOK" },
  { aiCategory: "STREETLIGHT", aiUrgency: "MEDIUM", status: "DONE", tile: "LAMPU_UTILITI" },
  { aiCategory: "ANIMALS", aiUrgency: "MEDIUM", status: "IN_PROGRESS", tile: "GANGGUAN_AWAM" },
  { aiCategory: "ILLEGAL_STALL", aiUrgency: "LOW", status: "ASSIGNED", tile: "PENTADBIRAN_LAIN" },
  { aiCategory: "ROAD", aiUrgency: "HIGH", status: "RECEIVED", tile: "JALAN_INFRA" },
  { aiCategory: "WASTE", aiUrgency: "MEDIUM", status: "IN_PROGRESS", tile: "SAMPAH_KEBERSIHAN" },
  { aiCategory: "DRAINAGE", aiUrgency: "HIGH", status: "ASSIGNED", tile: "LONGKANG_POKOK" },
  { aiCategory: "STREETLIGHT", aiUrgency: "LOW", status: "DONE", tile: "LAMPU_UTILITI" },
] as const;

const zones: Zone[] = ["Bandar", "Apas", "Balung", "Kampung", "Kuhara", "Tanjung Batu"];

function agencyFromCategory(category: TriageOutput["category"]): {
  ownerAgency: OwnerAgency;
  confidence: number;
  reason: string;
} {
  if (category === "ROAD") return { ownerAgency: "JKR", confidence: 88, reason: "Road surface maintenance falls under JKR scope." };
  if (category === "DRAINAGE") return { ownerAgency: "MPT", confidence: 91, reason: "Drain and local flood mitigation are municipal operations." };
  if (category === "STREETLIGHT") return { ownerAgency: "SESB", confidence: 84, reason: "Streetlight electrical network is linked to SESB utility scope." };
  if (category === "WASTE") return { ownerAgency: "MPT", confidence: 94, reason: "Solid waste and public cleanliness are municipal responsibilities." };
  if (category === "ANIMALS") return { ownerAgency: "MPT", confidence: 83, reason: "Public nuisance and stray management are municipal enforcement tasks." };
  return { ownerAgency: "MPT", confidence: 79, reason: "Commercial enforcement is typically led by municipal authority." };
}

function fakeIc(index: number) {
  return `91010112${String(1000 + index).slice(-4)}`;
}

function fakeHash(value: string) {
  return `h_${value.split("").reduce((s, c) => s + c.charCodeAt(0), 0).toString(16)}`;
}

function playbookByCategory(category: TriageOutput["category"]) {
  if (category === "ROAD") return ["Verify hazard cone placement", "Assign road patch crew", "Upload repair photo"];
  if (category === "WASTE") return ["Schedule waste pickup", "Sanitize area", "Confirm clearance photo"];
  if (category === "DRAINAGE") return ["Inspect drain blockage", "Deploy suction team", "Recheck after rain"];
  if (category === "STREETLIGHT") return ["Check power line status", "Dispatch lighting technician", "Night verification"];
  if (category === "ANIMALS") return ["Send control unit", "Public safety notice", "Capture/report closure"];
  return ["Inspect site", "Enforcement action", "Closure report"];
}

export const seedComplaints: Complaint[] = Array.from({ length: 30 }).map((_, index) => {
  const z = zones[index % zones.length];
  const t = templates[index % templates.length];
  const desc = descriptions[index % descriptions.length];
  const createdAt = timeShift((index % 14) + 1, (index % 6) * 3);
  const datelineAt = new Date(new Date(createdAt).getTime() + 72 * 60 * 60 * 1000).toISOString();
  const center = zoneCoords[z];

  const latJitter = ((index % 5) - 2) * 0.0038;
  const lngJitter = ((index % 4) - 1.5) * 0.0043;

  const triage: TriageOutput = {
    category: t.aiCategory,
    urgency: t.aiUrgency,
    confidence: Number((0.82 + (index % 12) * 0.01).toFixed(2)),
    summary: `${t.aiCategory} issue in ${z}. Prioritize ${t.aiUrgency} handling for municipal response team.`,
    reasoning:
      t.aiUrgency === "HIGH"
        ? "Public safety and service disruption risk is significant; immediate municipal action is recommended."
        : "Service impact exists but no direct immediate physical hazard is indicated.",
    eta_hours: t.aiUrgency === "HIGH" ? 24 : t.aiUrgency === "MEDIUM" ? 72 : 168,
    topCategoryTileSuggestion: t.tile as CitizenCategoryTop,
    rasmiJenisAduanSuggestion: "Lain-Lain",
    officialMappingConfidence: 84,
    department: "General Services Unit",
  };

  const rasmiJenis = mapTriageToOfficial(triage, desc);
  const dept = mapOfficialJenisToDepartment(rasmiJenis);
  const owner = agencyFromCategory(triage.category);
  const reporterIC = fakeIc(index);
  const forwardPackage =
    owner.ownerAgency !== "MPT" && index % 3 === 0
      ? {
          toAgency: owner.ownerAgency,
          subject: `Forwarded municipal complaint ${String(index + 1).padStart(4, "0")} (${rasmiJenis})`,
          body: `Please review complaint in ${z}. Initial AI triage indicates cross-agency ownership.`,
          attachmentsMeta: [
            { name: `complaint-${index + 1}.jpg`, mime: "image/jpeg", sizeKb: 420 },
            { name: `site-map-${index + 1}.pdf`, mime: "application/pdf", sizeKb: 190 },
          ],
        }
      : null;

  triage.rasmiJenisAduanSuggestion = rasmiJenis;
  triage.department = dept;

  return {
    id: `TA-${String(index + 1).padStart(4, "0")}`,
    createdAt,
    datelineAt,
    zone: z,
    lat: Number((center.lat + latJitter).toFixed(6)),
    lng: Number((center.lng + lngJitter).toFixed(6)),
    description: desc,
    mediaType: index % 3 === 0 ? "PHOTO" : index % 7 === 0 ? "VIDEO" : "NONE",
    aiCategory: t.aiCategory,
    aiUrgency: t.aiUrgency,
    aiConfidence: triage.confidence,
    aiSummary: triage.summary,
    aiReasoning: triage.reasoning,
    aiEtaHours: triage.eta_hours,
    status: t.status,
    department: dept,
    presidentCopySentAt: createdAt,
    presidentReminderSentAt: t.status !== "DONE" && new Date(datelineAt).getTime() < Date.now() ? new Date().toISOString() : null,
    aiAudit: {
      complaintId: `TA-${String(index + 1).padStart(4, "0")}`,
      timestamp: createdAt,
      rawInput: {
        text: desc,
        zone: z,
        imageAttached: index % 3 === 0 || index % 7 === 0,
        categoryHint: t.tile as CitizenCategoryTop,
      },
      aiOutput: triage,
    },
    timeline: timeline(createdAt, t.status),
    ownerAgency: owner.ownerAgency,
    ownerAgencyConfidence: owner.confidence,
    ownerAgencyReason: owner.reason,
    forwardPackage,
    aiTriageJson: {
      schema: "tawau.triage.v1",
      category: triage.category,
      urgency: triage.urgency,
      confidence: triage.confidence,
      summary: triage.summary,
      reasoning: triage.reasoning,
      rasmiJenisAduanSuggestion: triage.rasmiJenisAduanSuggestion,
      ownerAgency: owner.ownerAgency,
      ownerAgencyConfidence: owner.confidence,
    },
    aiModelMeta: {
      model: "gpt-4.1-mini",
      version: "2026.02-demo",
      timestamp: createdAt,
    },
    aiVisionSummary:
      index % 4 === 0
        ? "Image suggests visible roadside defect and standing water near edge."
        : index % 6 === 0
          ? "Image indicates waste accumulation with potential hygiene concerns."
          : null,
    aiVisionLabels:
      index % 4 === 0
        ? ["pothole", "standing_water", "road_edge"]
        : index % 6 === 0
          ? ["trash_pile", "public_area", "odor_risk"]
          : null,
    predictedEtaHours: triage.eta_hours,
    predictedEtaReason:
      t.aiUrgency === "HIGH"
        ? "High urgency with safety risk; dispatch target within 24 hours."
        : "Standard municipal queue and workload forecast.",
    assignedOfficerRole: index % 2 === 0 ? "KJU/JU I/II/III/PJU" : null,
    reporterName: index % 5 === 0 ? "Anonymous Reporter" : `Pengadu ${index + 1}`,
    reporterIC,
    reporterAddress: `${10 + index}, Jalan Demo ${z}, Tawau`,
    reporterPhone: `01${String(20000000 + index).slice(0, 8)}`,
    reporterEmail: index % 4 === 0 ? `demo${index + 1}@mail.com` : null,
    dataIntegrity: {
      icHash: fakeHash(reporterIC),
      submittedAt: createdAt,
      consentChecked: true,
    },
    duplicateOf: null,
    mergedCaseIds: [],
    reopenCount: 0,
    slaEscalationLevel: "NONE",
    playbookActions: playbookByCategory(t.aiCategory),
    fieldEvidence: {
      beforeMediaUrl: index % 4 === 0 ? `https://dummyimage.com/640x360/94a3b8/ffffff&text=Before+${index + 1}` : null,
      afterMediaUrl:
        t.status === "DONE" && index % 3 === 0
          ? `https://dummyimage.com/640x360/16a34a/ffffff&text=After+${index + 1}`
          : null,
      completedAt:
        t.status === "DONE" ? new Date(new Date(createdAt).getTime() + 46 * 60 * 60 * 1000).toISOString() : null,
    },

    citizenCategoryTop: t.tile as CitizenCategoryTop,
    citizenText: desc,
    citizenZone: z,
    citizenLat: Number((center.lat + latJitter).toFixed(6)),
    citizenLng: Number((center.lng + lngJitter).toFixed(6)),
    citizenAddress: null,
    citizenMediaType: index % 3 === 0 ? "PHOTO" : index % 7 === 0 ? "VIDEO" : "NONE",
    citizenMediaUrl: null,
    citizenName: index % 5 === 0 ? null : `Pengadu ${index + 1}`,
    citizenPhone: `01${String(20000000 + index).slice(0, 8)}`,
    citizenEmail: index % 4 === 0 ? `demo${index + 1}@mail.com` : null,
    isAnonymous: index % 5 === 0,

    rasmiTarikh: createdAt,
    rasmiNoBilAduan: `TA-${String(index + 1).padStart(4, "0")}`,
    rasmiRujukanFolioSistem: null,
    rasmiSaluranAduan: "Sistem e-Aduan",
    rasmiJenisAduan: rasmiJenis,
    rasmiPegawaiBertanggungjawab: null,
    rasmiPeneranganAduan: `${desc}\nAI Summary: ${triage.summary}`,
    rasmiTandatanganPengadu: true,
    rasmiMaklumatTindakan: {
      tarikhMaklumbalas:
        t.status === "RECEIVED" ? null : new Date(new Date(createdAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
      tindakan: t.status === "RECEIVED" ? null : "Tindakan awal jabatan telah dimulakan.",
      tarikhTindakan:
        t.status === "DONE" ? new Date(new Date(createdAt).getTime() + 46 * 60 * 60 * 1000).toISOString() : null,
      statusRasmi: mapStatusToRasmiStatus(t.status),
      maklumatTambahan: null,
    },
  };
});

export const seedActionLogs: ComplaintActionLog[] = seedComplaints.flatMap((item) => {
  const logs: ComplaintActionLog[] = [
    {
      complaintId: item.id,
      type: "AI_TRIAGE",
      payload: {
        category: item.aiCategory,
        urgency: item.aiUrgency,
        ownerAgency: item.ownerAgency,
        confidence: item.aiConfidence,
      },
      createdAt: item.createdAt,
    },
  ];

  if (item.forwardPackage) {
    logs.push({
      complaintId: item.id,
      type: "FORWARD_PREPARED",
      payload: item.forwardPackage,
      createdAt: new Date(new Date(item.createdAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (item.status !== "RECEIVED") {
    logs.push({
      complaintId: item.id,
      type: "STATUS_CHANGED",
      payload: { from: "RECEIVED", to: item.status },
      createdAt: item.timeline[Math.min(1, item.timeline.length - 1)]?.at ?? item.createdAt,
    });
  }

  if (item.status === "DONE" && Number(item.id.slice(-2)) % 2 === 0) {
    logs.push({
      complaintId: item.id,
      type: "FEEDBACK_SENT",
      payload: { channel: "SMS", token: `fb-${item.id.toLowerCase()}` },
      createdAt: new Date(new Date(item.createdAt).getTime() + 50 * 60 * 60 * 1000).toISOString(),
    });
    logs.push({
      complaintId: item.id,
      type: "FEEDBACK_RECEIVED",
      payload: { puasHati: true, rating: 4 },
      createdAt: new Date(new Date(item.createdAt).getTime() + 60 * 60 * 60 * 1000).toISOString(),
    });
  }

  return logs;
});

export const seedFeedbacks: Feedback[] = seedComplaints
  .filter((item) => item.status === "DONE" && Number(item.id.slice(-2)) % 2 === 0)
  .map((item, idx) => ({
    complaintId: item.id,
    token: `fb-${item.id.toLowerCase()}`,
    puasHati: idx % 4 !== 0,
    rating: (idx % 5) + 1 as 1 | 2 | 3 | 4 | 5,
    comment: idx % 3 === 0 ? "Respons cepat dan tindakan jelas." : null,
    createdAt: new Date(new Date(item.createdAt).getTime() + 60 * 60 * 60 * 1000).toISOString(),
  }));
