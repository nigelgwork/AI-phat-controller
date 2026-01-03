import { NextRequest, NextResponse } from "next/server";
import { getAllBeads, getBeadsByStatus, getActionableBeads, getBeadsStats, getRecentEvents } from "@/lib/beads";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const rig = searchParams.get("rig") || undefined;
  const actionable = searchParams.get("actionable") === "true";
  const statsOnly = searchParams.get("stats") === "true";
  const events = searchParams.get("events") === "true";

  try {
    if (events) {
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const recentEvents = getRecentEvents(limit);
      return NextResponse.json({ events: recentEvents });
    }

    if (statsOnly) {
      const stats = getBeadsStats(rig);
      return NextResponse.json({ stats });
    }

    if (actionable) {
      const beads = getActionableBeads(rig);
      return NextResponse.json({ beads });
    }

    if (status) {
      const beads = getBeadsByStatus(status, rig);
      return NextResponse.json({ beads });
    }

    const beads = getAllBeads(rig);
    return NextResponse.json({ beads });
  } catch (error) {
    console.error("Failed to fetch beads:", error);
    return NextResponse.json(
      { error: "Failed to fetch beads" },
      { status: 500 }
    );
  }
}
