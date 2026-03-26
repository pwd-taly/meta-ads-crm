export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";

export async function GET() {
  const today = startOfDay(new Date());
  const last7 = subDays(today, 7);
  const last30 = subDays(today, 30);

  const [
    totalLeads,
    leadsToday,
    leadsLast7,
    leadsLast30,
    booked,
    closed,
    lost,
    contacted,
    newLeads,
    revenueResult,
    recentLeads,
    leadsByCampaign,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count({ where: { createdAt: { gte: last7 } } }),
    prisma.lead.count({ where: { createdAt: { gte: last30 } } }),
    prisma.lead.count({ where: { status: "booked" } }),
    prisma.lead.count({ where: { status: "closed" } }),
    prisma.lead.count({ where: { status: "lost" } }),
    prisma.lead.count({ where: { status: "contacted" } }),
    prisma.lead.count({ where: { status: "new" } }),
    prisma.lead.aggregate({
      _sum: { saleAmount: true },
      where: { status: "closed", saleAmount: { not: null } },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.lead.groupBy({
      by: ["campaignName"],
      _count: { id: true },
      where: { campaignName: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
  ]);

  const totalRevenue = revenueResult._sum.saleAmount || 0;
  const conversionRate = totalLeads > 0 ? (closed / totalLeads) * 100 : 0;

  return NextResponse.json({
    stats: {
      totalLeads,
      leadsToday,
      leadsLast7,
      leadsLast30,
      booked,
      closed,
      lost,
      contacted,
      newLeads,
      totalRevenue,
      conversionRate,
    },
    pipeline: [
      { status: "new", label: "New", count: newLeads },
      { status: "contacted", label: "Contacted", count: contacted },
      { status: "booked", label: "Booked", count: booked },
      { status: "closed", label: "Closed", count: closed },
      { status: "lost", label: "Lost", count: lost },
    ],
    recentLeads,
    leadsByCampaign: leadsByCampaign.map((c) => ({
      name: c.campaignName || "Unknown",
      count: c._count.id,
    })),
  });
}
