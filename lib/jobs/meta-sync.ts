import { prisma } from "@/lib/db";

const META_API_VERSION = "v18.0";
const META_API_BASE = `https://graph.instagram.com/${META_API_VERSION}`;

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  budget?: number;
  daily_budget?: number;
  spend?: string;
  insights?: {
    impressions?: string;
    clicks?: string;
  };
  actions?: Array<{ action_type: string; value: string }>;
}

export async function syncCampaignsForAccount(
  metaAccountId: string,
  accessToken: string,
  orgId: string
) {
  console.log(`Syncing campaigns for account ${metaAccountId}`);

  try {
    // Fetch campaigns from Meta
    const response = await fetch(
      `${META_API_BASE}/${metaAccountId}/campaigns?access_token=${accessToken}&fields=id,name,status,budget,daily_budget,spend,insights.fields(impressions,clicks,actions)`
    );

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    const data = await response.json();
    const campaigns: MetaCampaign[] = data.data || [];

    // Update or create campaigns in DB
    for (const campaign of campaigns) {
      const conversions = campaign.actions
        ?.find((a) => a.action_type === "purchase")
        ?.value || "0";

      // Map Meta API status to CampaignStatus enum
      const statusMap: Record<string, "active" | "paused" | "archived"> = {
        "ACTIVE": "active",
        "PAUSED": "paused",
        "ARCHIVED": "archived",
        "active": "active",
        "paused": "paused",
        "archived": "archived",
      };

      const mappedStatus = statusMap[campaign.status] || "active";

      await prisma.campaign.upsert({
        where: { metaCampaignId: campaign.id },
        create: {
          metaCampaignId: campaign.id,
          name: campaign.name,
          status: mappedStatus,
          budget: campaign.budget ? campaign.budget / 100 : null,
          spend: campaign.spend ? parseFloat(campaign.spend) / 100 : null,
          impressions: campaign.insights?.impressions
            ? parseInt(campaign.insights.impressions, 10)
            : null,
          clicks: campaign.insights?.clicks
            ? parseInt(campaign.insights.clicks, 10)
            : null,
          conversions: parseInt(conversions, 10),
          syncedAt: new Date(),
          orgId,
          metaAdAccountId: metaAccountId,
        },
        update: {
          name: campaign.name,
          status: mappedStatus,
          budget: campaign.budget ? campaign.budget / 100 : null,
          spend: campaign.spend ? parseFloat(campaign.spend) / 100 : null,
          impressions: campaign.insights?.impressions
            ? parseInt(campaign.insights.impressions, 10)
            : null,
          clicks: campaign.insights?.clicks
            ? parseInt(campaign.insights.clicks, 10)
            : null,
          conversions: parseInt(conversions, 10),
          syncedAt: new Date(),
        },
      });
    }

    console.log(`Synced ${campaigns.length} campaigns for account ${metaAccountId}`);
  } catch (error) {
    console.error(`Sync failed for account ${metaAccountId}:`, error);
    throw error;
  }
}

export async function syncAllCampaigns() {
  console.log("Starting global campaign sync");

  const accounts = await prisma.metaAdAccount.findMany();

  for (const account of accounts) {
    try {
      await syncCampaignsForAccount(
        account.metaAdAccountId,
        account.metaAccessToken,
        account.orgId
      );
    } catch (error) {
      console.error(`Failed to sync account ${account.metaAdAccountId}:`, error);
      // Continue with next account
    }
  }

  console.log("Global campaign sync completed");
}
