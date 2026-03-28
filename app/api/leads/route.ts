import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";
import { getPaginationParams, createPaginationResponse } from "@/lib/pagination";

const handler = async (request: NextRequest, context: any) => {
  if (request.method === "GET") {
    const { searchParams } = request.nextUrl;
    const { orgId } = context;

    // Get pagination
    const { page, limit } = getPaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Get sort parameter
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    // Build where clause
    const where: any = { orgId };

    // Optional filters
    const status = searchParams.get("status");
    if (status && status !== "all") {
      where.status = status;
    }

    const campaign = searchParams.get("campaign");
    if (campaign && campaign !== "all") {
      where.campaignName = campaign;
    }

    const minScore = searchParams.get("minScore");
    if (minScore) {
      where.aiScore = { gte: parseInt(minScore, 10) };
    }

    const maxScore = searchParams.get("maxScore");
    if (maxScore) {
      if (where.aiScore) {
        where.aiScore.lte = parseInt(maxScore, 10);
      } else {
        where.aiScore = { lte: parseInt(maxScore, 10) };
      }
    }

    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Query
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    // Get distinct campaigns for filter (scoped to org)
    const campaigns = await prisma.lead.findMany({
      select: { campaignName: true },
      distinct: ["campaignName"],
      where: { orgId, campaignName: { not: null } },
    });

    const response = createPaginationResponse(leads, total, page, limit);
    return NextResponse.json({
      ...response,
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
