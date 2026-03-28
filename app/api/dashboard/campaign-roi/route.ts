import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context;

  const campaigns = await prisma.campaign.findMany({
    where: { orgId },
  });

  const campaignsWithROI = campaigns
    .map((campaign) => {
      const roi = campaign.spend ? campaign.conversions! / campaign.spend : 0;
      return {
        name: campaign.name,
        roi: parseFloat(roi.toFixed(2)),
      };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10); // Top 10

  return NextResponse.json({ campaigns: campaignsWithROI });
};

export const GET = requireAuth(handler);
