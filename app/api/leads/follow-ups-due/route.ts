import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ApiContext } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;

  const now = new Date();

  const dueLeads = await prisma.lead.findMany({
    where: {
      orgId,
      followUpDueDate: {
        lte: now,
      },
      followUpAction: {
        not: "none",
      },
    },
    orderBy: { followUpDueDate: "asc" },
  });

  return NextResponse.json({
    count: dueLeads.length,
    leads: dueLeads,
  });
};

export const GET = requireAuth(handler);
