import {
  Category,
  CitizenCategoryTop,
  Department,
  RasmiJenisAduan,
  TriageOutput,
  Urgency,
} from "@/lib/types";
import { mapOfficialJenisToDepartment, mapTriageToOfficial } from "@/lib/mapping";

type TriageInput = { text: string; zone?: string; imageDataUrl?: string; categoryHint?: CitizenCategoryTop | null };
export const DEFAULT_OPENAI_TRIAGE_MODEL = "gpt-4.1-mini";

const categories: Category[] = ["ROAD", "WASTE", "DRAINAGE", "STREETLIGHT", "ANIMALS", "ILLEGAL_STALL"];
const urgencies: Urgency[] = ["LOW", "MEDIUM", "HIGH"];
const topTiles: CitizenCategoryTop[] = [
  "JALAN_INFRA",
  "SAMPAH_KEBERSIHAN",
  "LAMPU_UTILITI",
  "LONGKANG_POKOK",
  "GANGGUAN_AWAM",
  "PENTADBIRAN_LAIN",
];
const officialJenis: RasmiJenisAduan[] = [
  "Bangunan",
  "Jalan Rosak",
  "Kacau/Ganggu ( Bising/Bau )",
  "Kacau Ganggu (Anjing Liar)",
  "Kawalan Perniagaan",
  "Longkang Pecah",
  "Penutup Longkang Rosak",
  "Longkang Tersumbat",
  "Perkhidmatan Sampah",
  "Pokok Tumbang/Cantas",
  "Rumah Setinggan",
  "Rumput Tidak Berpotong",
  "Lampu Awam",
  "Bangkai Binatang",
  "Halangan Awam",
  "Kebersihan Awam",
  "Taman Permainan Rosak",
  "Ternakan",
  "Tandas Sumbat/Penuh",
  "Pentadbiran",
  "Pembakaran Terbuka",
  "Lain-Lain",
];

const categoryDepartment: Record<Category, Department> = {
  ROAD: "Road Maintenance Unit",
  WASTE: "Solid Waste Unit",
  DRAINAGE: "Drainage & Flood Control",
  STREETLIGHT: "Public Lighting Unit",
  ANIMALS: "Animal Control Unit",
  ILLEGAL_STALL: "Enforcement Unit",
};

const urgencyEta: Record<Urgency, number> = {
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

export function getOpenAiTriageConfig() {
  return {
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_TRIAGE_MODEL,
  };
}

function inferUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  if (/(banjir|flood|accident|kemalangan|danger|bahaya|school|hospital|urgent|紧急|危险|blind corner)/.test(t)) {
    return "HIGH";
  }
  if (/(rosak|broken|blocked|bocor|stray|liar|垃圾|streetlight|lampu|longkang|stall|gelap|dark)/.test(t)) {
    return "MEDIUM";
  }
  return "LOW";
}

function inferCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/(jalan|road|pothole|lubang|asphalt|柏油|路洞)/.test(t)) return "ROAD";
  if (/(sampah|garbage|waste|dump|垃圾|kotor)/.test(t)) return "WASTE";
  if (/(drain|longkang|banjir|flood|排水沟|积水)/.test(t)) return "DRAINAGE";
  if (/(lampu|streetlight|light pole|照明|路灯)/.test(t)) return "STREETLIGHT";
  if (/(anjing|dog|monkey|stray|haiwan|动物)/.test(t)) return "ANIMALS";
  if (/(stall|gerai|penjaja|illegal booth|档口|摊位|lesen|执照|小贩)/.test(t)) return "ILLEGAL_STALL";
  return "WASTE";
}

function inferTopTile(category: Category, text: string, hint?: CitizenCategoryTop | null): CitizenCategoryTop {
  if (hint) return hint;
  const t = text.toLowerCase();
  if (category === "ROAD") return "JALAN_INFRA";
  if (category === "STREETLIGHT") return "LAMPU_UTILITI";
  if (category === "DRAINAGE" || /(pokok|tree|cantas|tumbang)/i.test(t)) return "LONGKANG_POKOK";
  if (category === "WASTE") return "SAMPAH_KEBERSIHAN";
  if (category === "ANIMALS") return "GANGGUAN_AWAM";
  return "PENTADBIRAN_LAIN";
}

function bounded(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function validateTriageObject(data: unknown, fallback: TriageOutput): TriageOutput {
  if (!data || typeof data !== "object") return fallback;
  const raw = data as Record<string, unknown>;

  const category = categories.includes(String(raw.category) as Category)
    ? (String(raw.category) as Category)
    : fallback.category;

  const urgency = urgencies.includes(String(raw.urgency) as Urgency)
    ? (String(raw.urgency) as Urgency)
    : fallback.urgency;

  const topCategoryTileSuggestion = topTiles.includes(String(raw.topCategoryTileSuggestion) as CitizenCategoryTop)
    ? (String(raw.topCategoryTileSuggestion) as CitizenCategoryTop)
    : fallback.topCategoryTileSuggestion;

  const rasmiJenisAduanSuggestion = officialJenis.includes(String(raw.rasmiJenisAduanSuggestion) as RasmiJenisAduan)
    ? (String(raw.rasmiJenisAduanSuggestion) as RasmiJenisAduan)
    : fallback.rasmiJenisAduanSuggestion;

  const department =
    typeof raw.department === "string" && raw.department.trim().length > 2
      ? (raw.department.trim().slice(0, 80) as Department)
      : mapOfficialJenisToDepartment(rasmiJenisAduanSuggestion);

  const etaRaw = Number(raw.eta_hours);
  const eta_hours = Number.isFinite(etaRaw) && etaRaw > 0 ? Math.round(etaRaw) : urgencyEta[urgency];

  const summary =
    typeof raw.summary === "string" && raw.summary.trim().length > 0
      ? raw.summary.trim().slice(0, 240)
      : fallback.summary;

  const reasoning =
    typeof raw.reasoning === "string" && raw.reasoning.trim().length > 0
      ? raw.reasoning.trim().slice(0, 280)
      : fallback.reasoning;

  return {
    category,
    urgency,
    confidence: bounded(raw.confidence, 0, 1, fallback.confidence),
    summary,
    department,
    eta_hours,
    reasoning,
    topCategoryTileSuggestion,
    rasmiJenisAduanSuggestion,
    officialMappingConfidence: Math.round(bounded(raw.officialMappingConfidence, 0, 100, fallback.officialMappingConfidence)),
  };
}

export function triageMock(input: TriageInput): TriageOutput {
  const text = input.text.trim();
  const category = inferCategory(text);
  const urgency = inferUrgency(text);
  const topCategoryTileSuggestion = inferTopTile(category, text, input.categoryHint);
  const rough: TriageOutput = {
    category,
    urgency,
    confidence: 0.82,
    summary: `Detected ${category} issue${input.zone ? ` in ${input.zone}` : ""}. Administrative routing is ready for municipal response team.`,
    department: categoryDepartment[category],
    eta_hours: urgencyEta[urgency],
    reasoning: input.imageDataUrl
      ? "Text keywords and attached image context suggest this category and urgency level for municipal handling."
      : "Text keywords indicate this category and urgency based on risk and public service disruption.",
    topCategoryTileSuggestion,
    rasmiJenisAduanSuggestion: "Lain-Lain",
    officialMappingConfidence: 76,
  };

  const rasmiJenisAduanSuggestion = mapTriageToOfficial(rough, text);
  const department = mapOfficialJenisToDepartment(rasmiJenisAduanSuggestion);

  return {
    ...rough,
    department,
    rasmiJenisAduanSuggestion,
    officialMappingConfidence: text ? 86 : 72,
  };
}

export async function triageComplaint(input: {
  text: string;
  zone?: string;
  imageDataUrl?: string;
  categoryHint?: CitizenCategoryTop | null;
}): Promise<TriageOutput> {
  const key = process.env.OPENAI_API_KEY;
  const fallback = triageMock(input);
  const config = getOpenAiTriageConfig();

  if (!key) {
    console.log("[triage] OPENAI_API_KEY missing, fallback mock used", fallback);
    return fallback;
  }

  try {
    const systemPrompt =
      "You are an AI municipal complaint triage officer for Tawau, Sabah. " +
      "Users may write in Bahasa Melayu, English, or Chinese. " +
      "Classify strictly into predefined categories, assess urgency by public safety risk, " +
      "generate an internal administrative summary in English, recommend responsible department, " +
      "estimate resolution time in hours, suggest one top citizen category tile, suggest one official Jenis Aduan label, " +
      "and include official mapping confidence 0-100. Return JSON only.";

    const userParts: Array<{ type: string; text?: string; image_url?: string }> = [
      {
        type: "input_text",
        text:
          `Zone: ${input.zone ?? "unknown"}\n` +
          `Category hint: ${input.categoryHint ?? "none"}\n` +
          `Complaint text: ${input.text || "(photo-only submission)"}`,
      },
    ];

    if (input.imageDataUrl) {
      userParts.push({ type: "input_image", image_url: input.imageDataUrl });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: userParts },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "municipal_triage_schema",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                category: { type: "string", enum: categories },
                urgency: { type: "string", enum: urgencies },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                summary: { type: "string", minLength: 10, maxLength: 240 },
                department: { type: "string", minLength: 3, maxLength: 80 },
                eta_hours: { type: "number", minimum: 1, maximum: 720 },
                reasoning: { type: "string", minLength: 10, maxLength: 280 },
                topCategoryTileSuggestion: { type: "string", enum: topTiles },
                rasmiJenisAduanSuggestion: { type: "string", enum: officialJenis },
                officialMappingConfidence: { type: "number", minimum: 0, maximum: 100 },
              },
              required: [
                "category",
                "urgency",
                "confidence",
                "summary",
                "department",
                "eta_hours",
                "reasoning",
                "topCategoryTileSuggestion",
                "rasmiJenisAduanSuggestion",
                "officialMappingConfidence",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.log("[triage] API response not ok, fallback mock used", response.status, response.statusText);
      return fallback;
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }>;
    };
    const rawText =
      data.output_text ??
      data.output
        ?.flatMap((item) => item.content ?? [])
        .find((item) => item.type === "output_text" && typeof item.text === "string")
        ?.text ??
      "{}";
    const parsed = JSON.parse(rawText);
    const validated = validateTriageObject(parsed, fallback);
    validated.rasmiJenisAduanSuggestion = mapTriageToOfficial(validated, input.text);
    validated.department = mapOfficialJenisToDepartment(validated.rasmiJenisAduanSuggestion);
    console.log("[triage] AI output", { model: config.model, result: validated });
    return validated;
  } catch (error) {
    console.log("[triage] API error, fallback mock used", error);
    return fallback;
  }
}
