import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const campaign = searchParams.get("campaign");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
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

  // Get distinct campaigns for filter
  const campaigns = await prisma.lead.findMany({
    select: { campaignName: true },
    distinct: ["campaignName"],
    where: { campaignName: { not: null } },
  });

  return NextResponse.json({
    leads,
    total,
    campaigns: campaigns.map((c) => c.campaignName).filter(Boolean),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lead = await prisma.lead.create({ data: body });
  return NextResponse.json(lead, { status: 201 });
}
