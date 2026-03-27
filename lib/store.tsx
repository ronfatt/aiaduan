"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedActionLogs, seedComplaints, seedFeedbacks } from "@/data/seed";
import { mapOfficialJenisToDepartment, mapStatusToRasmiStatus, mapTriageToOfficial } from "@/lib/mapping";
import {
  AIAuditLog,
  CitizenCategoryTop,
  ComplaintActionLog,
  Complaint,
  ComplaintStatus,
  Feedback,
  OwnerAgency,
  PegawaiBertanggungjawab,
  RasmiStatus,
  TriageOutput,
  Zone,
} from "@/lib/types";

type StoreState = {
  complaints: Complaint[];
  aiLogs: AIAuditLog[];
  actionLogs: ComplaintActionLog[];
  feedbacks: Feedback[];
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  addComplaint: (input: {
    zone: Zone;
    description: string;
    mediaType: Complaint["mediaType"];
    mediaUrl?: string | null;
    triage: TriageOutput;
    imageAttached: boolean;
    categoryTop: CitizenCategoryTop | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    isAnonymous: boolean;
    name: string | null;
    phone: string | null;
    email: string | null;
    confirmTrue: boolean;
    mergeTargetId?: string | null;
    aiMode?: "mock" | "live";
    aiModelName?: string | null;
  }) => Complaint;
  updateStatus: (id: string, status: ComplaintStatus) => void;
  updatePegawai: (id: string, pegawai: PegawaiBertanggungjawab | null) => void;
  updateMaklumatTindakan: (
    id: string,
    payload: {
      tarikhMaklumbalas?: string | null;
      tindakan?: string | null;
      tarikhTindakan?: string | null;
      statusRasmi?: RasmiStatus | null;
      maklumatTambahan?: string | null;
    },
  ) => void;
  sendPresidentReminder: (id: string, note?: string) => void;
  reopenComplaint: (id: string, reason?: string) => void;
  updateFieldEvidence: (id: string, payload: { beforeMediaUrl?: string | null; afterMediaUrl?: string | null }) => void;
  findDuplicateCandidates: (input: { zone: Zone; text: string }) => Complaint[];
  submitFeedback: (input: {
    complaintId: string;
    puasHati: boolean;
    rating: 1 | 2 | 3 | 4 | 5;
    comment?: string | null;
  }) => void;
  getById: (id: string) => Complaint | undefined;
};

const STORAGE_KEY = "tawau-aduan-ai-demo-v2";
const DATELINE_MS = 72 * 60 * 60 * 1000;

const StoreContext = createContext<StoreState | null>(null);

function normalizeComplaint(item: Complaint): Complaint {
  const datelineAt = item.datelineAt ?? new Date(new Date(item.createdAt).getTime() + DATELINE_MS).toISOString();
  const defaultAgency: OwnerAgency =
    item.aiCategory === "ROAD"
      ? "JKR"
      : item.aiCategory === "STREETLIGHT"
        ? "SESB"
        : "MPT";
  const reporterIC = item.reporterIC ?? "000000000000";
  return {
    ...item,
    datelineAt,
    presidentCopySentAt: item.presidentCopySentAt ?? item.createdAt,
    presidentReminderSentAt:
      item.presidentReminderSentAt ??
      (item.status !== "DONE" && new Date(datelineAt).getTime() < Date.now() ? new Date().toISOString() : null),
    ownerAgency: item.ownerAgency ?? defaultAgency,
    ownerAgencyConfidence: item.ownerAgencyConfidence ?? 75,
    ownerAgencyReason: item.ownerAgencyReason ?? "Seed default routing.",
    forwardPackage: item.forwardPackage ?? null,
    aiTriageJson:
      item.aiTriageJson ??
      ({
        category: item.aiCategory,
        urgency: item.aiUrgency,
        confidence: item.aiConfidence,
      } as Record<string, unknown>),
    aiModelMeta:
      item.aiModelMeta ??
      {
        model: "mock-triage",
        version: "seed-v1",
        timestamp: item.createdAt,
      },
    aiVisionSummary: item.aiVisionSummary ?? null,
    aiVisionLabels: item.aiVisionLabels ?? null,
    predictedEtaHours: item.predictedEtaHours ?? item.aiEtaHours ?? 48,
    predictedEtaReason: item.predictedEtaReason ?? "Default ETA from triage severity.",
    assignedOfficerRole: item.assignedOfficerRole ?? item.rasmiPegawaiBertanggungjawab ?? null,
    reporterName: item.reporterName ?? item.citizenName ?? "Anonymous Reporter",
    reporterIC,
    reporterAddress: item.reporterAddress ?? item.citizenAddress ?? "Address not provided",
    reporterPhone: item.reporterPhone ?? item.citizenPhone ?? "N/A",
    reporterEmail: item.reporterEmail ?? item.citizenEmail ?? null,
    dataIntegrity:
      item.dataIntegrity ??
      {
        icHash: `h_${reporterIC}`,
        submittedAt: item.createdAt,
        consentChecked: item.rasmiTandatanganPengadu ?? true,
      },
    duplicateOf: item.duplicateOf ?? null,
    mergedCaseIds: item.mergedCaseIds ?? [],
    reopenCount: item.reopenCount ?? 0,
    slaEscalationLevel: item.slaEscalationLevel ?? "NONE",
    playbookActions: item.playbookActions ?? [],
    fieldEvidence:
      item.fieldEvidence ?? {
        beforeMediaUrl: null,
        afterMediaUrl: null,
        completedAt: null,
      },
  };
}

function playbookByCategory(category: Complaint["aiCategory"]) {
  if (category === "ROAD") return ["Verify hazard cone placement", "Assign road patch crew", "Upload repair photo"];
  if (category === "WASTE") return ["Schedule waste pickup", "Sanitize area", "Confirm clearance photo"];
  if (category === "DRAINAGE") return ["Inspect drain blockage", "Deploy suction team", "Recheck after rain"];
  if (category === "STREETLIGHT") return ["Check power line status", "Dispatch lighting technician", "Night verification"];
  if (category === "ANIMALS") return ["Send control unit", "Public safety notice", "Capture/report closure"];
  return ["Inspect site", "Enforcement action", "Closure report"];
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function similarityScore(a: string, b: string) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter += 1;
  return inter / Math.max(sa.size, sb.size);
}

function readPersisted(): {
  complaints: Complaint[];
  aiLogs: AIAuditLog[];
  actionLogs: ComplaintActionLog[];
  feedbacks: Feedback[];
  demoMode: boolean;
} {
  if (typeof window === "undefined") {
    return {
      complaints: seedComplaints,
      aiLogs: seedComplaints.map((item) => item.aiAudit),
      actionLogs: seedActionLogs,
      feedbacks: seedFeedbacks,
      demoMode: true,
    };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      complaints: seedComplaints,
      aiLogs: seedComplaints.map((item) => item.aiAudit),
      actionLogs: seedActionLogs,
      feedbacks: seedFeedbacks,
      demoMode: true,
    };
  }
  try {
    const parsed = JSON.parse(raw) as {
      complaints?: Complaint[];
      aiLogs?: AIAuditLog[];
      actionLogs?: ComplaintActionLog[];
      feedbacks?: Feedback[];
      demoMode?: boolean;
    };
    const complaints = parsed.complaints?.length
      ? parsed.complaints.map((item) => normalizeComplaint(item as Complaint))
      : seedComplaints;
    return {
      complaints,
      aiLogs: parsed.aiLogs?.length ? parsed.aiLogs : complaints.map((item) => item.aiAudit),
      actionLogs: parsed.actionLogs?.length ? parsed.actionLogs : seedActionLogs,
      feedbacks: parsed.feedbacks?.length ? parsed.feedbacks : seedFeedbacks,
      demoMode: parsed.demoMode ?? true,
    };
  } catch {
    return {
      complaints: seedComplaints,
      aiLogs: seedComplaints.map((item) => item.aiAudit),
      actionLogs: seedActionLogs,
      feedbacks: seedFeedbacks,
      demoMode: true,
    };
  }
}

function nextId(list: Complaint[]) {
  return `TA-${String(list.length + 1).padStart(4, "0")}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = readPersisted();
  const [complaints, setComplaints] = useState<Complaint[]>(initial.complaints);
  const [aiLogs, setAiLogs] = useState<AIAuditLog[]>(initial.aiLogs);
  const [actionLogs, setActionLogs] = useState<ComplaintActionLog[]>(initial.actionLogs);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initial.feedbacks);
  const [demoMode, setDemoMode] = useState<boolean>(initial.demoMode);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ complaints, aiLogs, actionLogs, feedbacks, demoMode }),
    );
  }, [complaints, aiLogs, actionLogs, feedbacks, demoMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      const nowIso = new Date().toISOString();
      const escalationEvents: Array<{ complaintId: string; level: string }> = [];
      setComplaints((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const overdue = item.status !== "DONE" && new Date(item.datelineAt).getTime() < Date.now();
          if (!overdue) return item;
          const overdueMs = Date.now() - new Date(item.datelineAt).getTime();
          const nextLevel =
            overdueMs > 48 * 3600 * 1000
              ? "PRESIDENT"
              : overdueMs > 24 * 3600 * 1000
                ? "SUPERVISOR"
                : "OFFICER";
          const levelOrder = { NONE: 0, OFFICER: 1, SUPERVISOR: 2, PRESIDENT: 3 } as const;
          const escalated = levelOrder[nextLevel] > levelOrder[item.slaEscalationLevel];
          const reminderNeeded = !item.presidentReminderSentAt && nextLevel === "PRESIDENT";
          if (!reminderNeeded && !escalated) return item;
          changed = true;
          if (escalated) escalationEvents.push({ complaintId: item.id, level: nextLevel });
          return {
            ...item,
            slaEscalationLevel: escalated ? nextLevel : item.slaEscalationLevel,
            presidentReminderSentAt: reminderNeeded ? nowIso : item.presidentReminderSentAt,
            timeline: [
              ...item.timeline,
              ...(escalated
                ? [
                    {
                      status: item.status,
                      at: nowIso,
                      note: `SLA escalation level updated to ${nextLevel}.`,
                    },
                  ]
                : []),
              ...(reminderNeeded
                ? [
                    {
                      status: item.status,
                      at: nowIso,
                      note: "Auto reminder sent to President: case still unresolved after 3-day dateline",
                    },
                  ]
                : []),
            ],
          };
        });
        return changed ? next : prev;
      });
      if (escalationEvents.length) {
        setActionLogs((prev) => [
          ...escalationEvents.map((event) => ({
            complaintId: event.complaintId,
            type: "STATUS_CHANGED" as const,
            payload: { slaEscalationLevel: event.level },
            createdAt: nowIso,
          })),
          ...prev,
        ]);
      }
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const state = useMemo<StoreState>(
    () => ({
      complaints,
      aiLogs,
      actionLogs,
      feedbacks,
      demoMode,
      setDemoMode,
      addComplaint: ({
        zone,
        description,
        mediaType,
        mediaUrl,
        triage,
        imageAttached,
        categoryTop,
        lat,
        lng,
        address,
        isAnonymous,
        name,
        phone,
        email,
        confirmTrue,
        mergeTargetId,
        aiMode,
        aiModelName,
      }) => {
        const now = new Date().toISOString();
        if (mergeTargetId) {
          const merged = complaints.find((item) => item.id === mergeTargetId);
          if (merged) {
          setComplaints((prev) =>
            prev.map((item) => {
              if (item.id !== mergeTargetId) return item;
              return {
                ...item,
                mergedCaseIds: [...item.mergedCaseIds, `${item.id}-dup-${item.mergedCaseIds.length + 1}`],
                timeline: [
                  ...item.timeline,
                  {
                    status: item.status,
                    at: now,
                    note: "Duplicate complaint merged into this case by AI duplicate detection.",
                  },
                ],
              };
            }),
          );
          setActionLogs((prev) => [
            {
              complaintId: mergeTargetId,
              type: "HUMAN_OVERRIDE",
              payload: { action: "DUPLICATE_MERGED", fromText: description },
              createdAt: now,
            },
            ...prev,
          ]);
          return merged;
          }
        }
        const zoneCenters: Record<Zone, { lat: number; lng: number }> = {
          Bandar: { lat: 4.2498, lng: 117.8871 },
          Apas: { lat: 4.2238, lng: 117.9232 },
          Balung: { lat: 4.1816, lng: 117.9812 },
          Kampung: { lat: 4.2913, lng: 117.8661 },
          Kuhara: { lat: 4.2587, lng: 117.9111 },
          "Tanjung Batu": { lat: 4.2744, lng: 117.8949 },
        };

        const base = zoneCenters[zone];
        const datelineAt = new Date(new Date(now).getTime() + 72 * 60 * 60 * 1000).toISOString();
        const complaintId = nextId(complaints);
        const ownerAgency: OwnerAgency =
          triage.category === "ROAD"
            ? "JKR"
            : triage.category === "STREETLIGHT"
              ? "SESB"
              : "MPT";

        const rasmiJenisAduan = mapTriageToOfficial(triage, description);
        const department = mapOfficialJenisToDepartment(rasmiJenisAduan);

        const audit: AIAuditLog = {
          complaintId,
          timestamp: now,
          rawInput: {
            text: description,
            zone,
            imageAttached,
            categoryHint: categoryTop,
          },
          aiOutput: {
            ...triage,
            department,
            rasmiJenisAduanSuggestion: rasmiJenisAduan,
          },
        };

        const item: Complaint = {
          id: complaintId,
          createdAt: now,
          datelineAt,
          zone,
          lat: lat ?? Number((base.lat + (Math.random() - 0.5) * 0.005).toFixed(6)),
          lng: lng ?? Number((base.lng + (Math.random() - 0.5) * 0.005).toFixed(6)),
          description,
          mediaType,
          aiCategory: triage.category,
          aiUrgency: triage.urgency,
          aiConfidence: triage.confidence,
          aiSummary: triage.summary,
          aiReasoning: triage.reasoning,
          aiEtaHours: triage.eta_hours,
          status: "RECEIVED",
          department,
          presidentCopySentAt: now,
          presidentReminderSentAt: null,
          aiAudit: audit,
          timeline: [
            {
              status: "RECEIVED",
              at: now,
              note: "Complaint received from citizen portal",
            },
          ],
          ownerAgency,
          ownerAgencyConfidence: Math.round((triage.officialMappingConfidence + triage.confidence * 100) / 2),
          ownerAgencyReason:
            ownerAgency === "MPT"
              ? "Issue fits municipal service scope."
              : "Issue appears under external technical agency jurisdiction.",
          forwardPackage:
            ownerAgency === "MPT"
              ? null
              : {
                  toAgency: ownerAgency,
                  subject: `Forward request ${complaintId} (${rasmiJenisAduan})`,
                  body: `Please action complaint from ${zone}. AI triage indicates owner agency: ${ownerAgency}.`,
                  attachmentsMeta: mediaType === "NONE" ? [] : [{ name: `${complaintId}.jpg`, mime: "image/jpeg", sizeKb: 360 }],
                },
          aiTriageJson: {
            category: triage.category,
            urgency: triage.urgency,
            confidence: triage.confidence,
            summary: triage.summary,
            department,
            eta_hours: triage.eta_hours,
            reasoning: triage.reasoning,
            topCategoryTileSuggestion: triage.topCategoryTileSuggestion,
            rasmiJenisAduanSuggestion: rasmiJenisAduan,
            officialMappingConfidence: triage.officialMappingConfidence,
            ownerAgency,
          },
          aiModelMeta: {
            model: aiMode === "live" ? aiModelName || "gpt-4.1-mini" : "deterministic-mock",
            version: aiMode === "live" ? "2026.03-live" : "2026.03-demo",
            timestamp: now,
          },
          aiVisionSummary: imageAttached ? "Visual signal suggests infrastructure defect in public area." : null,
          aiVisionLabels: imageAttached ? ["public_asset", "defect_signal"] : null,
          predictedEtaHours: triage.eta_hours,
          predictedEtaReason:
            triage.urgency === "HIGH"
              ? "Immediate risk detected. Fast-track dispatch required."
              : "ETA based on historical queue and zone workload.",
          assignedOfficerRole: null,
          reporterName: isAnonymous ? "Anonymous Reporter" : name ?? "Unknown Reporter",
          reporterIC: isAnonymous ? "NA-ANON" : `IC-${complaintId}`,
          reporterAddress: address ?? "Address not provided",
          reporterPhone: phone ?? "N/A",
          reporterEmail: email,
          dataIntegrity: {
            icHash: `h_${(isAnonymous ? "NA-ANON" : `IC-${complaintId}`).replace(/[^A-Za-z0-9]/g, "")}`,
            submittedAt: now,
            consentChecked: confirmTrue,
          },
          duplicateOf: null,
          mergedCaseIds: [],
          reopenCount: 0,
          slaEscalationLevel: "NONE",
          playbookActions: playbookByCategory(triage.category),
          fieldEvidence: {
            beforeMediaUrl: mediaUrl ?? null,
            afterMediaUrl: null,
            completedAt: null,
          },

          citizenCategoryTop: categoryTop,
          citizenText: description,
          citizenZone: zone,
          citizenLat: lat,
          citizenLng: lng,
          citizenAddress: address,
          citizenMediaType: mediaType,
          citizenMediaUrl: mediaUrl ?? null,
          citizenName: isAnonymous ? null : name,
          citizenPhone: phone,
          citizenEmail: email,
          isAnonymous,

          rasmiTarikh: now,
          rasmiNoBilAduan: complaintId,
          rasmiRujukanFolioSistem: null,
          rasmiSaluranAduan: "Sistem e-Aduan",
          rasmiJenisAduan,
          rasmiPegawaiBertanggungjawab: null,
          rasmiPeneranganAduan: `${description}${triage.summary ? `\nAI Summary: ${triage.summary}` : ""}`,
          rasmiTandatanganPengadu: confirmTrue,
          rasmiMaklumatTindakan: {
            tarikhMaklumbalas: null,
            tindakan: null,
            tarikhTindakan: null,
            statusRasmi: "Dalam Tindakan",
            maklumatTambahan: null,
          },
        };

        setComplaints((prev) => [item, ...prev]);
        setAiLogs((prev) => [audit, ...prev]);
        setActionLogs((prev) => [
          {
            complaintId,
            type: "AI_TRIAGE",
            payload: {
              aiCategory: triage.category,
              aiUrgency: triage.urgency,
              ownerAgency,
              confidence: triage.confidence,
            },
            createdAt: now,
          },
          ...(item.forwardPackage
            ? [
                {
                  complaintId,
                  type: "FORWARD_PREPARED" as const,
                  payload: item.forwardPackage,
                  createdAt: now,
                },
              ]
            : []),
          ...prev,
        ]);
        return item;
      },
      updateStatus: (id, status) => {
        setComplaints((prev) =>
          prev.map((item) => {
            if (item.id !== id || item.status === status) return item;
            const nowIso = new Date().toISOString();
            const reminderNeeded =
              status !== "DONE" &&
              new Date(item.datelineAt).getTime() < Date.now() &&
              !item.presidentReminderSentAt;
            const nextMaklumat = {
              ...item.rasmiMaklumatTindakan,
              statusRasmi: mapStatusToRasmiStatus(status),
              tarikhTindakan:
                status === "DONE" && !item.rasmiMaklumatTindakan.tarikhTindakan
                  ? nowIso
                  : item.rasmiMaklumatTindakan.tarikhTindakan,
            };
            return {
              ...item,
              status,
              presidentReminderSentAt: reminderNeeded ? nowIso : item.presidentReminderSentAt,
              rasmiMaklumatTindakan: nextMaklumat,
              timeline: [
                ...item.timeline,
                {
                  status,
                  at: nowIso,
                  note:
                    status === "ASSIGNED"
                      ? "Case assigned to department officer"
                      : status === "IN_PROGRESS"
                        ? "Field team started intervention"
                        : "Issue resolved and closed",
                },
                ...(reminderNeeded
                  ? [
                      {
                        status: status,
                        at: nowIso,
                        note: "Reminder sent to President: case still unresolved after 3-day dateline",
                      },
                    ]
                  : []),
              ],
            };
          }),
        );
        setActionLogs((prev) => [
          {
            complaintId: id,
            type: "STATUS_CHANGED",
            payload: { status },
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      },
      updatePegawai: (id, pegawai) => {
        setComplaints((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  rasmiPegawaiBertanggungjawab: pegawai,
                  assignedOfficerRole: pegawai,
                }
              : item,
          ),
        );
        setActionLogs((prev) => [
          {
            complaintId: id,
            type: "HUMAN_OVERRIDE",
            payload: { field: "assignedOfficerRole", value: pegawai },
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      },
      updateMaklumatTindakan: (id, payload) => {
        setComplaints((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              rasmiMaklumatTindakan: {
                ...item.rasmiMaklumatTindakan,
                ...payload,
              },
            };
          }),
        );
      },
      sendPresidentReminder: (id, note) => {
        const nowIso = new Date().toISOString();
        setComplaints((prev) =>
          prev.map((item) => {
            if (item.id !== id || item.status === "DONE") return item;
            return {
              ...item,
              presidentReminderSentAt: nowIso,
              timeline: [
                ...item.timeline,
                {
                  status: item.status,
                  at: nowIso,
                  note:
                    note ??
                    "Manual reminder sent to President: case still unresolved and requires executive visibility",
                },
              ],
            };
          }),
        );
        setActionLogs((prev) => [
          {
            complaintId: id,
            type: "HUMAN_OVERRIDE",
            payload: { field: "presidentReminder", note: note ?? "Manual reminder sent" },
            createdAt: nowIso,
          },
          ...prev,
        ]);
      },
      reopenComplaint: (id, reason) => {
        const nowIso = new Date().toISOString();
        setComplaints((prev) =>
          prev.map((item) => {
            if (item.id !== id || item.status !== "DONE") return item;
            return {
              ...item,
              status: "IN_PROGRESS",
              reopenCount: item.reopenCount + 1,
              rasmiMaklumatTindakan: {
                ...item.rasmiMaklumatTindakan,
                statusRasmi: "Dalam Tindakan",
              },
              timeline: [
                ...item.timeline,
                {
                  status: "IN_PROGRESS",
                  at: nowIso,
                  note: reason ?? "Case reopened after citizen follow-up request.",
                },
              ],
            };
          }),
        );
        setActionLogs((prev) => [
          {
            complaintId: id,
            type: "HUMAN_OVERRIDE",
            payload: { action: "REOPEN", reason: reason ?? "Citizen follow-up" },
            createdAt: nowIso,
          },
          ...prev,
        ]);
      },
      updateFieldEvidence: (id, payload) => {
        const nowIso = new Date().toISOString();
        setComplaints((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const nextAfter = payload.afterMediaUrl ?? item.fieldEvidence.afterMediaUrl;
            return {
              ...item,
              fieldEvidence: {
                beforeMediaUrl: payload.beforeMediaUrl ?? item.fieldEvidence.beforeMediaUrl,
                afterMediaUrl: nextAfter,
                completedAt: nextAfter ? nowIso : item.fieldEvidence.completedAt,
              },
            };
          }),
        );
        setActionLogs((prev) => [
          {
            complaintId: id,
            type: "HUMAN_OVERRIDE",
            payload: { action: "FIELD_EVIDENCE_UPDATE", ...payload },
            createdAt: nowIso,
          },
          ...prev,
        ]);
      },
      findDuplicateCandidates: ({ zone, text }) => {
        if (!text.trim()) return [];
        return complaints
          .filter((item) => item.zone === zone && item.status !== "DONE")
          .map((item) => ({ item, score: similarityScore(item.description, text) }))
          .filter((row) => row.score >= 0.25)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((row) => row.item);
      },
      submitFeedback: ({ complaintId, puasHati, rating, comment }) => {
        const createdAt = new Date().toISOString();
        const token = `fb-${complaintId.toLowerCase()}`;
        setFeedbacks((prev) => [{ complaintId, token, puasHati, rating, comment: comment ?? null, createdAt }, ...prev]);
        setActionLogs((prev) => [
          {
            complaintId,
            type: "FEEDBACK_RECEIVED",
            payload: { puasHati, rating, comment: comment ?? null },
            createdAt,
          },
          ...prev,
        ]);
      },
      getById: (id) => complaints.find((item) => item.id === id),
    }),
    [complaints, aiLogs, actionLogs, feedbacks, demoMode],
  );

  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
