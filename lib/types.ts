export type Zone = "Bandar" | "Apas" | "Balung" | "Kampung" | "Kuhara" | "Tanjung Batu";

export type Category =
  | "ROAD"
  | "WASTE"
  | "DRAINAGE"
  | "STREETLIGHT"
  | "ANIMALS"
  | "ILLEGAL_STALL";

export type CitizenCategoryTop =
  | "JALAN_INFRA"
  | "SAMPAH_KEBERSIHAN"
  | "LAMPU_UTILITI"
  | "LONGKANG_POKOK"
  | "GANGGUAN_AWAM"
  | "PENTADBIRAN_LAIN";

export type Urgency = "LOW" | "MEDIUM" | "HIGH";

export type ComplaintStatus = "RECEIVED" | "ASSIGNED" | "IN_PROGRESS" | "DONE";
export type SlaEscalationLevel = "NONE" | "OFFICER" | "SUPERVISOR" | "PRESIDENT";

export type MediaType = "PHOTO" | "VIDEO" | "NONE";

export type Department =
  | "Road Maintenance Unit"
  | "Solid Waste Unit"
  | "Drainage & Flood Control"
  | "Public Lighting Unit"
  | "Animal Control Unit"
  | "Enforcement Unit"
  | "Building & Public Safety Unit"
  | "Administration Unit"
  | "Landscape & Parks Unit"
  | "General Services Unit";

export type RasmiSaluranAduan =
  | "Whatsapp"
  | "Sistem e-Aduan"
  | "Datang Sendiri"
  | "Telefon"
  | "Sistem i-Adu"
  | "Surat"
  | "Email"
  | "Faks"
  | "SMS"
  | "Akhbar";

export type RasmiJenisAduan =
  | "Bangunan"
  | "Jalan Rosak"
  | "Kacau/Ganggu ( Bising/Bau )"
  | "Kacau Ganggu (Anjing Liar)"
  | "Kawalan Perniagaan"
  | "Longkang Pecah"
  | "Penutup Longkang Rosak"
  | "Longkang Tersumbat"
  | "Perkhidmatan Sampah"
  | "Pokok Tumbang/Cantas"
  | "Rumah Setinggan"
  | "Rumput Tidak Berpotong"
  | "Lampu Awam"
  | "Bangkai Binatang"
  | "Halangan Awam"
  | "Kebersihan Awam"
  | "Taman Permainan Rosak"
  | "Ternakan"
  | "Tandas Sumbat/Penuh"
  | "Pentadbiran"
  | "Pembakaran Terbuka"
  | "Lain-Lain";

export type RasmiStatus = "Dalam Tindakan" | "Selesai";

export type PegawaiBertanggungjawab =
  | "PRESIDEN"
  | "TP"
  | "SUP"
  | "BR"
  | "PSU(P)"
  | "KPSU(O)/PPK/PPKP/PPO"
  | "KJU/JU I/II/III/PJU"
  | "PHB"
  | "PUU"
  | "PTM"
  | "JAD"
  | "PPLB";

export type OwnerAgency =
  | "MPT"
  | "JKR"
  | "JABATAN_AIR"
  | "SESB"
  | "POLIS"
  | "BOMBA"
  | "OTHERS";

export type ForwardPackage = {
  toAgency: OwnerAgency;
  subject: string;
  body: string;
  attachmentsMeta: Array<{
    name: string;
    mime: string;
    sizeKb: number;
  }>;
};

export type AiModelMeta = {
  model: string;
  version: string;
  timestamp: string;
};

export type DataIntegrity = {
  icHash: string;
  submittedAt: string;
  consentChecked: boolean;
};

export type ComplaintActionType =
  | "AI_TRIAGE"
  | "HUMAN_OVERRIDE"
  | "FORWARD_PREPARED"
  | "STATUS_CHANGED"
  | "FEEDBACK_SENT"
  | "FEEDBACK_RECEIVED";

export type ComplaintActionLog = {
  complaintId: string;
  type: ComplaintActionType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Feedback = {
  complaintId: string;
  token: string;
  puasHati: boolean;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  createdAt: string;
};

export type TimelineEvent = {
  status: ComplaintStatus;
  at: string;
  note: string;
};

export type TriageOutput = {
  category: Category;
  urgency: Urgency;
  confidence: number;
  summary: string;
  department: Department;
  eta_hours: number;
  reasoning: string;
  topCategoryTileSuggestion: CitizenCategoryTop;
  rasmiJenisAduanSuggestion: RasmiJenisAduan;
  officialMappingConfidence: number;
};

export type AIAuditLog = {
  complaintId: string;
  timestamp: string;
  rawInput: {
    text: string;
    zone?: string;
    imageAttached: boolean;
    categoryHint?: CitizenCategoryTop | null;
  };
  aiOutput: TriageOutput;
};

export type Complaint = {
  id: string;
  createdAt: string;
  datelineAt: string;
  zone: Zone;
  lat: number;
  lng: number;
  description: string;
  mediaType: MediaType;
  aiCategory: Category;
  aiUrgency: Urgency;
  aiConfidence: number;
  aiSummary: string;
  aiReasoning: string;
  aiEtaHours: number;
  status: ComplaintStatus;
  department: Department;
  presidentCopySentAt: string;
  presidentReminderSentAt: string | null;
  aiAudit: AIAuditLog;
  timeline: TimelineEvent[];
  ownerAgency: OwnerAgency;
  ownerAgencyConfidence: number;
  ownerAgencyReason: string;
  forwardPackage: ForwardPackage | null;
  aiTriageJson: Record<string, unknown>;
  aiModelMeta: AiModelMeta;
  aiVisionSummary: string | null;
  aiVisionLabels: string[] | null;
  predictedEtaHours: number;
  predictedEtaReason: string;
  assignedOfficerRole: string | null;
  reporterName: string;
  reporterIC: string;
  reporterAddress: string;
  reporterPhone: string;
  reporterEmail: string | null;
  dataIntegrity: DataIntegrity;
  duplicateOf: string | null;
  mergedCaseIds: string[];
  reopenCount: number;
  slaEscalationLevel: SlaEscalationLevel;
  playbookActions: string[];
  fieldEvidence: {
    beforeMediaUrl: string | null;
    afterMediaUrl: string | null;
    completedAt: string | null;
  };

  citizenCategoryTop: CitizenCategoryTop | null;
  citizenText: string;
  citizenZone: string;
  citizenLat: number | null;
  citizenLng: number | null;
  citizenAddress: string | null;
  citizenMediaType: MediaType;
  citizenMediaUrl: string | null;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenEmail: string | null;
  isAnonymous: boolean;

  rasmiTarikh: string;
  rasmiNoBilAduan: string;
  rasmiRujukanFolioSistem: string | null;
  rasmiSaluranAduan: RasmiSaluranAduan;
  rasmiJenisAduan: RasmiJenisAduan;
  rasmiPegawaiBertanggungjawab: PegawaiBertanggungjawab | null;
  rasmiPeneranganAduan: string;
  rasmiTandatanganPengadu: boolean;
  rasmiMaklumatTindakan: {
    tarikhMaklumbalas: string | null;
    tindakan: string | null;
    tarikhTindakan: string | null;
    statusRasmi: RasmiStatus | null;
    maklumatTambahan: string | null;
  };
};
