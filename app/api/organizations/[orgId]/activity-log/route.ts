import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;

  const activities = await prisma.leadActivity.findMany({
    where: { orgId },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return NextResponse.json({ activities });
};

export const GET = requireAuth(handler);
