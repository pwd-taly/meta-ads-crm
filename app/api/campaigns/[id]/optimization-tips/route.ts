import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ApiContext } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const campaignId = request.nextUrl.pathname.split("/")[3]; // Extract from URL /api/campaigns/[id]/optimization-tips

  // Get campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || campaign.orgId !== orgId) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  const tips: string[] = [];

  // Tip 1: Budget efficiency
  if (campaign.spend && campaign.budget) {
    const percentOfBudget = (campaign.spend / campaign.budget) * 100;
    if (percentOfBudget > 90) {
      tips.push("⚠️ Campaign spending 90%+ of budget. Consider increasing budget.");
    }
  }

  // Tip 2: ROI analysis
  if (campaign.spend && campaign.conversions && campaign.conversions > 0) {
    const costPerConversion = campaign.spend / campaign.conversions;
    if (costPerConversion > 100) {
      tips.push(
        `💰 High cost per conversion ($${costPerConversion.toFixed(2)}). Consider adjusting targeting.`
      );
    } else if (costPerConversion < 20) {
      tips.push(
        `🎉 Excellent ROI ($${costPerConversion.toFixed(2)} per conversion). Consider increasing budget.`
      );
    }
  }

  // Tip 3: Click-through rate
  if (campaign.clicks && campaign.impressions && campaign.impressions > 0) {
    const ctr = (campaign.clicks / campaign.impressions) * 100;
    if (ctr < 1) {
      tips.push(`📉 Low CTR (${ctr.toFixed(2)}%). Review ad creative and targeting.`);
    } else if (ctr > 5) {
      tips.push(`📈 High CTR (${ctr.toFixed(2)}%). Creative is resonating well!`);
    }
  }

  // Tip 4: Conversion rate
  if (campaign.clicks && campaign.conversions && campaign.clicks > 0) {
    const conversionRate = (campaign.conversions / campaign.clicks) * 100;
    if (conversionRate < 1) {
      tips.push(
        `🔄 Low conversion rate (${conversionRate.toFixed(2)}%). Check landing page experience.`
      );
    }
  }

  // If no tips, add generic
  if (tips.length === 0) {
    tips.push("Campaign is performing well. Monitor performance metrics.");
  }

  return NextResponse.json({
    campaignId,
    tips: tips.slice(0, 5), // Limit to 5 tips
  });
};

export const GET = requireAuth(handler);
