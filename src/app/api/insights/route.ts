import { NextRequest, NextResponse } from "next/server";
import { computeInsights } from "@/lib/insights";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rig = searchParams.get("rig") || undefined;

  try {
    const insights = computeInsights(rig);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Failed to compute insights:", error);
    return NextResponse.json(
      { error: "Failed to compute insights" },
      { status: 500 }
    );
  }
}
