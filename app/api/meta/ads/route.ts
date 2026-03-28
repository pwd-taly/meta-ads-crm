import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";
import { fetchMetaCampaigns, fetchDailyInsights, extractLeadsFromActions, calcCPL } from "@/lib/meta";
import { format, subDays } from "date-fns";

const handler = async (request: NextRequest, context: any) => {
  const { searchParams } = new URL(request.url);
  const datePreset = searchParams.get("datePreset") || "last_30d";
  const customSince = searchParams.get("since");
  const customUntil = searchParams.get("until");

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings?.metaAccessToken || !settings?.metaAdAccountId) {
    return NextResponse.json({ error: "Meta credentials not configured" }, { status: 400 });
  }

  const token = settings.metaAccessToken;
  const accountId = settings.metaAdAccountId.replace("act_", "");

  try {
    // Fetch campaigns
    const campaignsData = await fetchMetaCampaigns(accountId, token, datePreset);

    // Calculate days for daily chart
    let daysBack = 30;
    if (datePreset === "last_7d") daysBack = 7;
    else if (datePreset === "last_14d") daysBack = 14;
    else if (datePreset === "this_month") daysBack = 30;

    const since = customSince || format(subDays(new Date(), daysBack), "yyyy-MM-dd");
    const until = customUntil || format(new Date(), "yyyy-MM-dd");

    // Fetch daily breakdown
    const dailyData = await fetchDailyInsights(accountId, token, since, until);

    // Process campaigns
    const campaigns = (campaignsData.data || []).map((c: Record<string, unknown>) => {
      const insights = (c.insights as { data?: Array<Record<string, unknown>> })?.data?.[0] || {};
      const spend = parseFloat((insights.spend as string) || "0");
      const impressions = parseInt((insights.impressions as string) || "0", 10);
      const clicks = parseInt((insights.clicks as string) || "0", 10);
      const reach = parseInt((insights.reach as string) || "0", 10);
      const ctr = parseFloat((insights.ctr as string) || "0");
      const leads = extractLeadsFromActions((insights.actions as Array<{ action_type: string; value: string }>) || []);
      const cpl = calcCPL(spend, leads);

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        spend,
        impressions,
        clicks,
        reach,
        ctr,
        leads,
        cpl,
      };
    });

    // Totals
    const totals = campaigns.reduce(
      (acc: Record<string, number>, c: Record<string, number>) => ({
        spend: acc.spend + c.spend,
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        leads: acc.leads + c.leads,
        reach: acc.reach + c.reach,
      }),
      { spend: 0, impressions: 0, clicks: 0, leads: 0, reach: 0 }
    );
    totals.cpl = calcCPL(totals.spend, totals.leads);
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    // Daily chart data
    const daily = (dailyData.data || []).map((d: Record<string, unknown>) => ({
      date: d.date_start,
      spend: parseFloat((d.spend as string) || "0"),
      impressions: parseInt((d.impressions as string) || "0", 10),
      clicks: parseInt((d.clicks as string) || "0", 10),
      leads: extractLeadsFromActions((d.actions as Array<{ action_type: string; value: string }>) || []),
    }));

    // CPL trend
    const dailyWithCPL = daily.map((d: { date: string; spend: number; impressions: number; clicks: number; leads: number }) => ({
      ...d,
      cpl: calcCPL(d.spend, d.leads),
    }));

    // Spend by campaign (for donut)
    const spendByCampaign = campaigns
      .filter((c: { spend: number }) => c.spend > 0)
      .map((c: { name: string; spend: number }) => ({ name: c.name, value: c.spend }));

    return NextResponse.json({
      campaigns,
      totals,
      daily: dailyWithCPL,
      spendByCampaign,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Meta API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const GET = requireAuth(handler);
