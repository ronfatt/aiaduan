import {
  CitizenCategoryTop,
  ComplaintStatus,
  RasmiJenisAduan,
  RasmiStatus,
  TriageOutput,
  Department,
} from "@/lib/types";

export const OFFICIAL_JENIS_BY_TILE: Record<CitizenCategoryTop, RasmiJenisAduan[]> = {
  JALAN_INFRA: ["Jalan Rosak", "Bangunan", "Halangan Awam", "Taman Permainan Rosak", "Rumah Setinggan"],
  SAMPAH_KEBERSIHAN: ["Perkhidmatan Sampah", "Kebersihan Awam", "Rumput Tidak Berpotong", "Bangkai Binatang"],
  LAMPU_UTILITI: ["Lampu Awam"],
  LONGKANG_POKOK: ["Longkang Tersumbat", "Longkang Pecah", "Penutup Longkang Rosak", "Pokok Tumbang/Cantas"],
  GANGGUAN_AWAM: ["Kacau/Ganggu ( Bising/Bau )", "Kacau Ganggu (Anjing Liar)", "Ternakan", "Tandas Sumbat/Penuh"],
  PENTADBIRAN_LAIN: ["Pentadbiran", "Kawalan Perniagaan", "Pembakaran Terbuka", "Lain-Lain"],
};

const keywordRules: Array<{ test: RegExp; jenis: RasmiJenisAduan }> = [
  { test: /(lampu|streetlight|light pole|lamp\b|路灯)/i, jenis: "Lampu Awam" },
  { test: /(longkang|drain|parit|排水沟)/i, jenis: "Longkang Tersumbat" },
  { test: /(longkang|drain|parit|排水沟).*(pecah|broken|retak)|(?:pecah|broken|retak).*(longkang|drain|parit|排水沟)/i, jenis: "Longkang Pecah" },
  { test: /(penutup\s*longkang|cover\s*drain|manhole\s*cover|排水沟盖)/i, jenis: "Penutup Longkang Rosak" },
  { test: /(jalan|pothole|lubang|路洞)/i, jenis: "Jalan Rosak" },
  { test: /(sampah|garbage|trash|垃圾)/i, jenis: "Perkhidmatan Sampah" },
  { test: /(bau|bising|noise|smell|臭|吵)/i, jenis: "Kacau\/Ganggu \( Bising\/Bau \)" },
  { test: /(anjing liar|stray dog|流浪狗)/i, jenis: "Kacau Ganggu (Anjing Liar)" },
  { test: /(pembakaran|open burning|烧垃圾)/i, jenis: "Pembakaran Terbuka" },
  { test: /(tandas|toilet|堵塞|马桶)/i, jenis: "Tandas Sumbat/Penuh" },
  { test: /(lesen|gerai|illegal stall|执照|小贩)/i, jenis: "Kawalan Perniagaan" },
];

export function mapTopCategoryToOfficial(tile: CitizenCategoryTop) {
  return OFFICIAL_JENIS_BY_TILE[tile] ?? ["Lain-Lain"];
}

export function mapTriageToOfficial(triageResult: TriageOutput, citizenText: string): RasmiJenisAduan {
  const text = citizenText || "";

  for (const rule of keywordRules) {
    if (rule.test.test(text)) return rule.jenis;
  }

  if (triageResult.rasmiJenisAduanSuggestion) return triageResult.rasmiJenisAduanSuggestion;
  return mapTopCategoryToOfficial(triageResult.topCategoryTileSuggestion)[0] ?? "Lain-Lain";
}

export function mapOfficialJenisToDepartment(rasmiJenisAduan: RasmiJenisAduan): Department {
  if (["Jalan Rosak", "Halangan Awam"].includes(rasmiJenisAduan)) return "Road Maintenance Unit";
  if (["Bangunan", "Rumah Setinggan", "Taman Permainan Rosak"].includes(rasmiJenisAduan)) return "Building & Public Safety Unit";
  if (["Perkhidmatan Sampah", "Kebersihan Awam", "Rumput Tidak Berpotong", "Bangkai Binatang"].includes(rasmiJenisAduan)) return "Solid Waste Unit";
  if (["Longkang Tersumbat", "Longkang Pecah", "Penutup Longkang Rosak"].includes(rasmiJenisAduan)) return "Drainage & Flood Control";
  if (["Lampu Awam"].includes(rasmiJenisAduan)) return "Public Lighting Unit";
  if (["Kacau Ganggu (Anjing Liar)", "Ternakan"].includes(rasmiJenisAduan)) return "Animal Control Unit";
  if (["Kawalan Perniagaan", "Pembakaran Terbuka"].includes(rasmiJenisAduan)) return "Enforcement Unit";
  if (["Pokok Tumbang/Cantas"].includes(rasmiJenisAduan)) return "Landscape & Parks Unit";
  if (["Pentadbiran"].includes(rasmiJenisAduan)) return "Administration Unit";
  if (["Kacau/Ganggu ( Bising/Bau )", "Tandas Sumbat/Penuh", "Lain-Lain"].includes(rasmiJenisAduan)) return "General Services Unit";
  return "General Services Unit";
}

export function mapStatusToRasmiStatus(status: ComplaintStatus): RasmiStatus {
  return status === "DONE" ? "Selesai" : "Dalam Tindakan";
}
