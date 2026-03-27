import { NextResponse } from "next/server";
import { getOpenAiTriageConfig } from "@/lib/triage";

export async function GET() {
  const config = getOpenAiTriageConfig();
  return NextResponse.json({
    hasOpenAIKey: config.hasOpenAIKey,
    model: config.model,
    liveAvailable: config.hasOpenAIKey,
  });
}
