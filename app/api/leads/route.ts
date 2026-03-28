import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  if (request.method === "GET") {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const campaign = searchParams.get("campaign");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = { orgId: context.orgId };
    if (status && status !== "all") where.status = status;
    if (campaign && campaign !== "all") where.campaignName = campaign;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    // Get distinct campaigns for filter (scoped to org)
    const campaigns = await prisma.lead.findMany({
      select: { campaignName: true },
      distinct: ["campaignName"],
      where: { orgId: context.orgId, campaignName: { not: null } },
    });

    return NextResponse.json({
      leads,
      total,
      campaigns: campaigns.map((c) => c.campaignName).filter(Boolean),
    });
  }

  // POST
  const body = await request.json();
  body.orgId = context.orgId;
  const lead = await prisma.lead.create({ data: body });
  return NextResponse.json(lead, { status: 201 });
};

export const GET = requireAuth(handler);
export const POST = requireAuth(handler);
