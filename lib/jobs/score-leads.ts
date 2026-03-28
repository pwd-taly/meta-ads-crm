import { prisma } from "@/lib/db";

interface ScoringFactors {
  engagementCount: number;
  daysSinceCreation: number;
  daysSinceUpdate: number;
  hasPhone: boolean;
  hasEmail: boolean;
  status: string;
  campaignPerformance: "high" | "medium" | "low" | "unknown";
}

function calculateScore(factors: ScoringFactors): { score: number; reason: string } {
  let score = 50; // Base score
  let reasons: string[] = [];

  // Recency bonus (fresher leads score higher)
  if (factors.daysSinceCreation <= 1) {
    score += 15;
    reasons.push("Fresh lead");
  } else if (factors.daysSinceUpdate <= 3) {
    score += 10;
    reasons.push("Recently updated");
  }

  // Contact completeness (more ways to reach = higher priority)
  let contactMethods = 0;
  if (factors.hasEmail) contactMethods++;
  if (factors.hasPhone) contactMethods++;

  if (contactMethods === 2) {
    score += 10;
    reasons.push("Complete contact info");
  } else if (contactMethods === 0) {
    score -= 10;
    reasons.push("Missing contact info");
  }

  // Status influence
  const statusScores: Record<string, number> = {
    new: 15,
    contacted: 10,
    booked: 20,
    closed: 0, // Don't prioritize closed
    lost: -20,
  };

  score += statusScores[factors.status.toLowerCase()] || 5;

  // Campaign performance (leads from winning campaigns score higher)
  if (factors.campaignPerformance === "high") {
    score += 15;
    reasons.push("From high-performing campaign");
  } else if (factors.campaignPerformance === "medium") {
    score += 5;
  } else if (factors.campaignPerformance === "low") {
    score -= 10;
    reasons.push("From underperforming campaign");
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reason: reasons.join(", ") || "Standard lead priority",
  };
}

async function getCampaignPerformance(
  campaignId: string | null | undefined,
  orgId: string
): Promise<"high" | "medium" | "low" | "unknown"> {
  if (!campaignId) return "unknown";

  const campaign = await prisma.campaign.findUnique({
    where: { metaCampaignId: campaignId },
  });

  if (!campaign || !campaign.conversions || !campaign.spend) return "unknown";

  const roi = campaign.conversions / (campaign.spend || 1);
  if (roi > 2) return "high";
  if (roi > 1) return "medium";
  return "low";
}

export async function scoreLeadsForOrg(orgId: string) {
  console.log(`Scoring leads for org: ${orgId}`);

  const leads = await prisma.lead.findMany({
    where: { orgId },
    include: { org: true },
  });

  const now = new Date();

  for (const lead of leads) {
    const daysSinceCreation = Math.floor(
      (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const campaignPerf = await getCampaignPerformance(lead.campaignId, orgId);

    const { score, reason } = calculateScore({
      engagementCount: 1, // TODO: if you add engagement tracking, increment this
      daysSinceCreation,
      daysSinceUpdate,
      hasPhone: !!lead.phone,
      hasEmail: !!lead.email,
      status: lead.status,
      campaignPerformance: campaignPerf,
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiScore: score,
        scoreReason: reason,
        lastScoredAt: now,
      },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        orgId,
        action: "scored",
        metadata: {
          score,
          reason,
        },
      },
    });
  }

  console.log(`Scored ${leads.length} leads for org ${orgId}`);
  return leads.length;
}

export async function scoreAllLeads() {
  console.log("Starting global lead scoring job");

  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    await scoreLeadsForOrg(org.id);
  }

  console.log("Global scoring job completed");
}

export { calculateScore };
