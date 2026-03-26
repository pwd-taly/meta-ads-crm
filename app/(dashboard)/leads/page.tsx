export const dynamic = "force-dynamic";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { prisma } from "@/lib/db";

async function getInitialData() {
  const [leads, total, campaignsRaw, settings] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.lead.count(),
    prisma.lead.findMany({
      select: { campaignName: true },
      distinct: ["campaignName"],
      where: { campaignName: { not: null } },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  return {
    leads,
    total,
    campaigns: campaignsRaw.map((c) => c.campaignName).filter(Boolean) as string[],
    waTemplate:
      settings?.waMessageTemplate ||
      "Hi {{name}}, thanks for your interest! I'd love to share more details with you.",
    waTemplateEs:
      settings?.waMessageTemplateEs ||
      "Hola {{name}}, ¡gracias por tu interés! Me encantaría compartir más detalles contigo.",
  };
}

export default async function LeadsPage() {
  const { leads, total, campaigns, waTemplate, waTemplateEs } = await getInitialData();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total} total leads from Meta Ads
        </p>
      </div>
      <LeadsTable
        initialLeads={leads}
        campaigns={campaigns}
        waTemplate={waTemplate}
        waTemplateEs={waTemplateEs}
      />
    </div>
  );
}
