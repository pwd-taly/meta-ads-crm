import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context;

  const statuses = ["new", "contacted", "booked", "closed", "lost"] as const;

  const statusCounts = await Promise.all(
    statuses.map((status) =>
      prisma.lead.count({ where: { orgId, status: status as any } })
    )
  );

  const status = statuses
    .map((status, index) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: statusCounts[index],
    }))
    .filter((item) => item.value > 0);

  return NextResponse.json({ status });
};

export const GET = requireAuth(handler);
