import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-middleware";
import { syncAllCampaigns } from "@/lib/jobs/meta-sync";

const handler = async (request: NextRequest, context: any) => {
  try {
    await syncAllCampaigns();
    return NextResponse.json({ success: true, message: "Campaign sync completed" });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
};

export const POST = requireRole("admin", handler);
