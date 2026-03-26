export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { startOfDay, subDays } from "date-fns";
import { formatCurrency, formatNumber, STATUS_CONFIG } from "@/lib/utils";
import { Users, TrendingUp, DollarSign, Calendar, MessageCircle } from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { LeadsByCampaignChart } from "@/components/dashboard/LeadsByCampaignChart";

async function getDashboardData() {
  const today = startOfDay(new Date());
  const last7 = subDays(today, 7);

  const [totalLeads, leadsToday, leadsLast7, booked, closed, lost, contacted, newLeads, revenueResult, recentLeads, leadsByCampaign] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ where: { createdAt: { gte: last7 } } }),
      prisma.lead.count({ where: { status: "booked" } }),
      prisma.lead.count({ where: { status: "closed" } }),
      prisma.lead.count({ where: { status: "lost" } }),
      prisma.lead.count({ where: { status: "contacted" } }),
      prisma.lead.count({ where: { status: "new" } }),
      prisma.lead.aggregate({
        _sum: { saleAmount: true },
        where: { status: "closed", saleAmount: { not: null } },
      }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.lead.groupBy({
        by: ["campaignName"],
        _count: { id: true },
        where: { campaignName: { not: null } },
        orderBy: { _count: { id: "desc" } },
        take: 6,
      }),
    ]);

  return {
    totalLeads,
    leadsToday,
    leadsLast7,
    booked,
    closed,
    lost,
    contacted,
    newLeads,
    totalRevenue: revenueResult._sum.saleAmount || 0,
    conversionRate: totalLeads > 0 ? ((closed / totalLeads) * 100).toFixed(1) : "0",
    recentLeads,
    leadsByCampaign: leadsByCampaign.map((c) => ({
      name: c.campaignName || "Unknown",
      count: c._count.id,
    })),
    pipeline: [
      { status: "new", label: "New", count: newLeads, color: "#3B82F6" },
      { status: "contacted", label: "Contacted", count: contacted, color: "#EAB308" },
      { status: "booked", label: "Booked", count: booked, color: "#A855F7" },
      { status: "closed", label: "Closed", count: closed, color: "#22C55E" },
      { status: "lost", label: "Lost", count: lost, color: "#EF4444" },
    ],
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const statsCards = [
    {
      label: "Total Leads",
      value: formatNumber(data.totalLeads),
      sub: `+${data.leadsToday} today`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Last 7 Days",
      value: formatNumber(data.leadsLast7),
      sub: "new leads",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(data.totalRevenue),
      sub: `${data.closed} deals closed`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Appointments",
      value: formatNumber(data.booked),
      sub: `${data.conversionRate}% conv. rate`,
      icon: Calendar,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your Meta Ads leads & performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-semibold mb-4">Lead Pipeline</h2>
        <div className="flex gap-2">
          {data.pipeline.map((stage, i) => {
            const pct = data.totalLeads > 0 ? Math.round((stage.count / data.totalLeads) * 100) : 0;
            return (
              <div key={stage.status} className="flex-1 min-w-0">
                <div
                  className="h-2.5 rounded-full mb-2"
                  style={{ backgroundColor: stage.color, opacity: 0.85 }}
                />
                <p className="text-xs text-muted-foreground truncate">{stage.label}</p>
                <p className="text-sm font-semibold">{stage.count}</p>
                <p className="text-xs text-muted-foreground">{pct}%</p>
              </div>
            );
          })}
        </div>
        {/* Full pipeline bar */}
        <div className="mt-4 h-3 rounded-full overflow-hidden flex">
          {data.pipeline.filter(s => s.count > 0).map((stage) => (
            <div
              key={stage.status}
              style={{
                width: `${(stage.count / data.totalLeads) * 100}%`,
                backgroundColor: stage.color,
              }}
              title={`${stage.label}: ${stage.count}`}
            />
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Campaign */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold mb-4">Leads by Campaign</h2>
          <LeadsByCampaignChart data={data.leadsByCampaign} />
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Leads</h2>
            <Link href="/leads" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentLeads.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.campaignName || "No campaign"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color} ${cfg.bg}`}
                  >
                    {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
