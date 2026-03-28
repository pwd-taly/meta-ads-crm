import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ApiContext } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const leadId = request.nextUrl.pathname.split("/")[3]; // Extract from URL /api/leads/[id]/score

  // Verify lead belongs to org
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead || lead.orgId !== orgId) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Score single lead by simplified calculation
  const now = new Date();
  const daysSinceCreation = Math.floor(
    (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let score = 50;
  let reason = "Calculated on demand";

  if (daysSinceCreation <= 1) score += 15;
  if (lead.phone && lead.email) score += 10;

  score = Math.max(0, Math.min(100, score));

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      aiScore: score,
      scoreReason: reason,
      lastScoredAt: now,
    },
  });

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      orgId,
      action: "scored",
      metadata: { score, reason },
    },
  });

  return NextResponse.json({ lead: updated, scored: true });
};

export const POST = requireRole("admin", handler);
