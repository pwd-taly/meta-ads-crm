import { prisma } from "./db";

const META_API_BASE = "https://graph.facebook.com/v20.0";

export async function getMetaSettings() {
  return prisma.settings.findUnique({ where: { id: 1 } });
}

export async function fetchMetaCampaigns(
  adAccountId: string,
  accessToken: string,
  datePreset: string = "last_30d"
) {
  const fields = [
    "id",
    "name",
    "status",
    "objective",
    `insights.date_preset(${datePreset}){spend,impressions,clicks,reach,ctr,cpc,actions,cost_per_action_type}`,
  ].join(",");

  const url = `${META_API_BASE}/act_${adAccountId}/campaigns?fields=${fields}&access_token=${accessToken}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Meta API error");
  }
  return res.json();
}

export async function fetchMetaAdSets(
  campaignId: string,
  accessToken: string,
  datePreset: string = "last_30d"
) {
  const fields = [
    "id",
    "name",
    "status",
    `insights.date_preset(${datePreset}){spend,impressions,clicks,reach,ctr,cpc,actions}`,
  ].join(",");
  const url = `${META_API_BASE}/${campaignId}/adsets?fields=${fields}&access_token=${accessToken}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch ad sets");
  return res.json();
}

export async function fetchMetaAds(
  adSetId: string,
  accessToken: string,
  datePreset: string = "last_30d"
) {
  const fields = [
    "id",
    "name",
    "status",
    `insights.date_preset(${datePreset}){spend,impressions,clicks,reach,ctr,cpc}`,
  ].join(",");
  const url = `${META_API_BASE}/${adSetId}/ads?fields=${fields}&access_token=${accessToken}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch ads");
  return res.json();
}

export async function fetchDailyInsights(
  adAccountId: string,
  accessToken: string,
  since: string,
  until: string
) {
  const fields = "spend,impressions,clicks,reach,actions";
  const url = `${META_API_BASE}/act_${adAccountId}/insights?fields=${fields}&time_increment=1&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}&limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch daily insights");
  return res.json();
}

export function extractLeadsFromActions(actions: Array<{ action_type: string; value: string }> = []) {
  const leadAction = actions.find(
    (a) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped"
  );
  return leadAction ? parseInt(leadAction.value, 10) : 0;
}

export function calcCPL(spend: number, leads: number) {
  if (!leads || !spend) return 0;
  return spend / leads;
}

export function buildWALink(phone: string, template: string, name: string) {
  const cleaned = phone.replace(/\D/g, "");
  const msg = template.replace(/\{\{name\}\}/gi, name);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
}
