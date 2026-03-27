import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_OPENAI_TRIAGE_MODEL, getOpenAiTriageConfig, triageComplaint, triageMock } from "@/lib/triage";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    text?: string;
    zone?: string;
    demoMode?: boolean;
    imageDataUrl?: string;
    categoryHint?: string | null;
  };
  const text = body.text?.trim() ?? "";
  const hasImage = Boolean(body.imageDataUrl);
  const config = getOpenAiTriageConfig();

  if (!text && !hasImage) {
    return NextResponse.json({ error: "text or image is required" }, { status: 400 });
  }

  if (body.demoMode) {
    return NextResponse.json(
      triageMock({
        text,
        zone: body.zone,
        imageDataUrl: body.imageDataUrl,
        categoryHint: body.categoryHint as never,
      }),
      {
        headers: {
          "x-ai-mode": "mock",
          "x-ai-model": "deterministic-mock",
        },
      },
    );
  }

  const result = await triageComplaint({
    text,
    zone: body.zone,
    imageDataUrl: body.imageDataUrl,
    categoryHint: body.categoryHint as never,
  });
  const liveMode = config.hasOpenAIKey ? "live" : "mock";
  return NextResponse.json(result, {
    headers: {
      "x-ai-mode": liveMode,
      "x-ai-model": liveMode === "live" ? config.model : DEFAULT_OPENAI_TRIAGE_MODEL,
    },
  });
}
