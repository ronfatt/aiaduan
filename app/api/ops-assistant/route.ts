import { NextRequest, NextResponse } from "next/server";
import { getOpenAiTriageConfig } from "@/lib/triage";
import {
  getOpsAssistantReply,
  OpsAssistantCompactCase,
  OpsAssistantReply,
  OpsAssistantScope,
} from "@/lib/opsAssistant";
import { Complaint } from "@/lib/types";

function toComplaintShape(cases: OpsAssistantCompactCase[]): Complaint[] {
  return cases.map((item) => item as Complaint);
}

function validateReply(data: unknown, fallback: OpsAssistantReply): OpsAssistantReply {
  if (!data || typeof data !== "object") return fallback;
  const raw = data as Record<string, unknown>;
  const bullets =
    Array.isArray(raw.bullets) && raw.bullets.every((item) => typeof item === "string")
      ? (raw.bullets as string[]).slice(0, 6)
      : fallback.bullets;

  return {
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 120) : fallback.title,
    summary: typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim().slice(0, 320) : fallback.summary,
    bullets,
    followup: typeof raw.followup === "string" && raw.followup.trim() ? raw.followup.trim().slice(0, 180) : fallback.followup,
  };
}

function buildContext(scope: OpsAssistantScope, complaints: Complaint[]) {
  const unresolved = complaints.filter((item) => item.status !== "DONE");
  const overdue = unresolved.filter((item) => item.slaEscalationLevel !== "NONE");
  const top = unresolved
    .slice()
    .sort((a, b) => b.aiConfidence - a.aiConfidence)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      zone: item.zone,
      rasmiJenisAduan: item.rasmiJenisAduan,
      status: item.status,
      department: item.department,
      urgency: item.aiUrgency,
      summary: item.aiSummary,
      ownerAgency: item.ownerAgency,
      sla: item.slaEscalationLevel,
      pegawai: item.rasmiPegawaiBertanggungjawab,
      nextAction:
        item.status === "RECEIVED"
          ? "Assign field team"
          : item.status === "ASSIGNED"
            ? "Confirm acknowledgement and update tindakan"
            : item.status === "IN_PROGRESS"
              ? "Upload after evidence and close"
              : "Completed",
    }));

  return {
    scope,
    totals: {
      total: complaints.length,
      unresolved: unresolved.length,
      overdue: overdue.length,
    },
    cases: top,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    scope?: OpsAssistantScope;
    question?: string;
    complaints?: OpsAssistantCompactCase[];
    demoMode?: boolean;
  };

  const scope = body.scope === "president" ? "president" : "department";
  const question = body.question?.trim() ?? "";
  const complaints = toComplaintShape(body.complaints ?? []);
  const fallback = getOpsAssistantReply(scope, question, complaints);

  if (!complaints.length) {
    return NextResponse.json({ error: "complaints are required" }, { status: 400 });
  }

  if (body.demoMode) {
    return NextResponse.json(fallback, {
      headers: {
        "x-ai-mode": "mock",
        "x-ai-model": "deterministic-ops-assistant",
      },
    });
  }

  const key = process.env.OPENAI_API_KEY;
  const config = getOpenAiTriageConfig();

  if (!key) {
    return NextResponse.json(fallback, {
      headers: {
        "x-ai-mode": "mock",
        "x-ai-model": "deterministic-ops-assistant",
      },
    });
  }

  try {
    const systemPrompt =
      "You are an AI operations assistant for a municipal complaints platform in Tawau, Sabah. " +
      "Reply in concise Bahasa Melayu. " +
      "Use only the provided complaint context. " +
      "Help internal officers or the President understand unfinished cases, reasons for delay, and next actions. " +
      "Be practical, structured, and decision-oriented. Return JSON only.";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  `Role scope: ${scope}\n` +
                  `Question: ${question || "(empty)" }\n` +
                  `Complaint context JSON:\n${JSON.stringify(buildContext(scope, complaints), null, 2)}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "ops_assistant_reply",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string", minLength: 6, maxLength: 120 },
                summary: { type: "string", minLength: 12, maxLength: 320 },
                bullets: {
                  type: "array",
                  minItems: 2,
                  maxItems: 6,
                  items: { type: "string", minLength: 8, maxLength: 160 },
                },
                followup: { type: "string", minLength: 8, maxLength: 180 },
              },
              required: ["title", "summary", "bullets", "followup"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.log("[ops-assistant] API response not ok, fallback used", response.status, response.statusText);
      return NextResponse.json(fallback, {
        headers: {
          "x-ai-mode": "mock",
          "x-ai-model": "deterministic-ops-assistant",
        },
      });
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
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
    const validated = validateReply(parsed, fallback);
    console.log("[ops-assistant] AI output", { model: config.model, result: validated });

    return NextResponse.json(validated, {
      headers: {
        "x-ai-mode": "live",
        "x-ai-model": config.model,
      },
    });
  } catch (error) {
    console.log("[ops-assistant] API error, fallback used", error);
    return NextResponse.json(fallback, {
      headers: {
        "x-ai-mode": "mock",
        "x-ai-model": "deterministic-ops-assistant",
      },
    });
  }
}
