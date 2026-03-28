import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context;

  // Get counts by status
  const [newCount, contactedCount, bookedCount, closedCount, lostCount] = await Promise.all([
    prisma.lead.count({ where: { orgId, status: "new" } }),
    prisma.lead.count({ where: { orgId, status: "contacted" } }),
    prisma.lead.count({ where: { orgId, status: "booked" } }),
    prisma.lead.count({ where: { orgId, status: "closed" } }),
    prisma.lead.count({ where: { orgId, status: "lost" } }),
  ]);

  const funnel = [
    { stage: "New", count: newCount },
    { stage: "Contacted", count: contactedCount },
    { stage: "Booked", count: bookedCount },
    { stage: "Closed", count: closedCount },
    { stage: "Lost", count: lostCount },
  ];

  return NextResponse.json({ funnel });
};

export const GET = requireAuth(handler);
