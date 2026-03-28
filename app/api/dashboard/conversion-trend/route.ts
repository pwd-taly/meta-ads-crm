import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context;

  // Get leads from last 30 days, grouped by date
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const leads = await prisma.lead.findMany({
    where: {
      orgId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  // Group by date and calculate conversion rate
  const grouped = new Map<string, { total: number; converted: number }>();

  leads.forEach((lead) => {
    const date = lead.createdAt.toISOString().split("T")[0];
    const current = grouped.get(date) || { total: 0, converted: 0 };
    current.total += 1;
    if (lead.status === "closed") current.converted += 1;
    grouped.set(date, current);
  });

  const trend = Array.from(grouped.entries())
    .map(([date, { total, converted }]) => ({
      date,
      conversionRate: (converted / total) * 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ trend });
};

export const GET = requireAuth(handler);
