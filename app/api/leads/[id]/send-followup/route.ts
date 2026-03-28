import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ApiContext } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const leadId = request.nextUrl.pathname.split("/")[3]; // Extract from URL /api/leads/[id]/send-followup

  if (request.method === "POST") {
    // Verify lead belongs to org
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.orgId !== orgId) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    if (!lead.followUpAction) {
      return NextResponse.json(
        { error: "No follow-up action scheduled" },
        { status: 400 }
      );
    }

    // TODO: Implement actual sending logic (email, SMS, WhatsApp)
    // For now, just mark as sent
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        followUpDueDate: null,
      },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        orgId,
        action: "follow_up_sent",
        metadata: {
          action: lead.followUpAction,
          message: lead.followUpMessage,
        },
      },
    });

    return NextResponse.json({
      success: true,
      lead: updated,
      message: `Follow-up sent via ${lead.followUpAction}`,
    });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
};

export const POST = requireAuth(handler);
