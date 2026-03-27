import { NextRequest, NextResponse } from "next/server";
import { triageComplaint, triageMock } from "@/lib/triage";

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
    );
  }

  const result = await triageComplaint({
    text,
    zone: body.zone,
    imageDataUrl: body.imageDataUrl,
    categoryHint: body.categoryHint as never,
  });
  return NextResponse.json(result);
}
