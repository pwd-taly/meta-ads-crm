export const dynamic = "force-dynamic";
import { AdsAnalyticsClient } from "@/components/ads/AdsAnalyticsClient";
import { prisma } from "@/lib/db";

export default async function AdsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const hasCredentials = !!(settings?.metaAccessToken && settings?.metaAdAccountId);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ads Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Live data from your Meta Ads account
        </p>
      </div>
      <AdsAnalyticsClient hasCredentials={hasCredentials} />
    </div>
  );
}
