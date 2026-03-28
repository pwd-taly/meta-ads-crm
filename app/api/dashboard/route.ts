export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";
import { startOfDay, subDays } from "date-fns";

const handler = async (request: NextRequest, context: any) => {
  const orgId = context.orgId;
  const today = startOfDay(new Date());
  const last7 = subDays(today, 7);
  const last30 = subDays(today, 30);

  const baseWhere = { orgId };

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
    prisma.lead.count({ where: baseWhere }),
    prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: today } } }),
    prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: last7 } } }),
    prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: last30 } } }),
    prisma.lead.count({ where: { ...baseWhere, status: "booked" } }),
    prisma.lead.count({ where: { ...baseWhere, status: "closed" } }),
    prisma.lead.count({ where: { ...baseWhere, status: "lost" } }),
    prisma.lead.count({ where: { ...baseWhere, status: "contacted" } }),
    prisma.lead.count({ where: { ...baseWhere, status: "new" } }),
    prisma.lead.aggregate({
      _sum: { saleAmount: true },
      where: { ...baseWhere, status: "closed", saleAmount: { not: null } },
    }),
    prisma.lead.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.lead.groupBy({
      by: ["campaignName"],
      _count: { id: true },
      where: { ...baseWhere, campaignName: { not: null } },
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
};

export const GET = requireAuth(handler);
