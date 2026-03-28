import { NextRequest, NextResponse } from "next/server";
import { requireRole, ApiContext } from "@/lib/api-middleware";
import { scoreAllLeads } from "@/lib/jobs/score-leads";

const handler = async (request: NextRequest, context: ApiContext) => {
  // Admin only
  try {
    await scoreAllLeads();
    return NextResponse.json({ success: true, message: "Lead scoring completed" });
  } catch (error) {
    console.error("Scoring job failed:", error);
    return NextResponse.json(
      { error: "Scoring job failed" },
      { status: 500 }
    );
  }
};

export const POST = requireRole("admin", handler);
