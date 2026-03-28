import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;
  const { type } = await request.json(); // "leads" or "campaigns"

  try {
    if (type === "leads") {
      const leads = await prisma.lead.findMany({
        where: { orgId },
      });

      const headers = ["ID", "Name", "Email", "Phone", "Status", "Campaign", "Created"];
      const rows = leads.map((lead) => [
        lead.id,
        lead.name,
        lead.email || "",
        lead.phone || "",
        lead.status,
        lead.campaignName || "",
        lead.createdAt.toISOString(),
      ]);

      const csv = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=leads.csv",
        },
      });
    }

    if (type === "campaigns") {
      const campaigns = await prisma.campaign.findMany({
        where: { orgId },
      });

      const headers = ["ID", "Name", "Status", "Budget", "Spend", "Conversions", "ROI"];
      const rows = campaigns.map((c) => [
        c.id,
        c.name,
        c.status,
        c.budget || "",
        c.spend || "",
        c.conversions || "",
        c.spend ? (((c.conversions || 0) / c.spend) * 100).toFixed(2) : "",
      ]);

      const csv = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=campaigns.csv",
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
};

export const POST = requireAuth(handler);
