export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { startOfDay, subDays, subMonths, format } from "date-fns";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

function groupByDay(leads: { createdAt: Date }[], days: number) {
  const today = startOfDay(new Date());
  const map: Record<string, number> = {};
  leads.forEach((l) => {
    const key = format(new Date(l.createdAt), "MMM d");
    map[key] = (map[key] || 0) + 1;
  });
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(today, days - 1 - i);
    const key = format(d, "MMM d");
    return { date: key, leads: map[key] || 0 };
  });
}

function groupByWeek(leads: { createdAt: Date }[]) {
  const map: Record<string, number> = {};
  leads.forEach((l) => {
    const key = format(new Date(l.createdAt), "MMM d");
    map[key] = (map[key] || 0) + 1;
  });
  const today = startOfDay(new Date());
  const result: { date: string; leads: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekEnd = subDays(today, i * 7);
    let total = 0;
    for (let d = 0; d <= 6; d++) {
      const day = subDays(weekEnd, d);
      total += map[format(day, "MMM d")] || 0;
    }
    result.push({ date: format(weekEnd, "MMM d"), leads: total });
  }
  return result;
}

async function getDashboardData() {
  const today = startOfDay(new Date());
  const last30 = subDays(today, 30);
  const prev30start = subDays(today, 60);

  const [
    totalLeads, leadsToday, leadsLast30, leadsPrev30,
    booked, closed, lost, contacted, newLeads,
    revenueResult, prevRevenueResult,
    leads7d, leads30d, leads3m,
    allLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: today } } }),
    prisma.lead.count({ where: { createdAt: { gte: last30 } } }),
    prisma.lead.count({ where: { createdAt: { gte: prev30start, lt: last30 } } }),
    prisma.lead.count({ where: { status: "booked" } }),
    prisma.lead.count({ where: { status: "closed" } }),
    prisma.lead.count({ where: { status: "lost" } }),
    prisma.lead.count({ where: { status: "contacted" } }),
    prisma.lead.count({ where: { status: "new" } }),
    prisma.lead.aggregate({ _sum: { saleAmount: true }, where: { status: "closed", saleAmount: { not: null } } }),
    prisma.lead.aggregate({ _sum: { saleAmount: true }, where: { status: "closed", saleAmount: { not: null }, createdAt: { lt: last30 } } }),
    prisma.lead.findMany({ where: { createdAt: { gte: subDays(today, 7) } }, select: { createdAt: true } }),
    prisma.lead.findMany({ where: { createdAt: { gte: subDays(today, 30) } }, select: { createdAt: true } }),
    prisma.lead.findMany({ where: { createdAt: { gte: subMonths(today, 3) } }, select: { createdAt: true } }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, phone: true, campaignName: true, adName: true, status: true, source: true, saleAmount: true, createdAt: true },
    }),
  ]);

  const totalRevenue = revenueResult._sum.saleAmount || 0;
  const prevRevenue = prevRevenueResult._sum.saleAmount || 0;

  return {
    totalLeads, leadsToday, leadsLast30,
    leadsChange: leadsPrev30 > 0 ? (((leadsLast30 - leadsPrev30) / leadsPrev30) * 100).toFixed(1) : null,
    booked, closed, lost, contacted, newLeads,
    totalRevenue,
    revenueChange: prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null,
    conversionRate: totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(1) : "0",
    chartData: {
      "7d": groupByDay(leads7d, 7),
      "30d": groupByDay(leads30d, 30),
      "3m": groupByWeek(leads3m),
    },
    // Serialize dates to strings so they can pass from server to client
    leads: allLeads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      saleAmount: l.saleAmount ?? null,
    })),
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardContent {...data} />;
}
