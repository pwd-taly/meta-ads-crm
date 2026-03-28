import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ApiContext } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: ApiContext) => {
  const { orgId } = context;
  const leadId = request.nextUrl.pathname.split("/")[3]; // Extract from URL /api/leads/[id]/follow-up

  if (request.method === "POST") {
    const { action, dueDate, message } = await request.json();

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

    // Validate inputs
    if (!action || !["email", "call", "whatsapp", "none"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    // Update lead
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        followUpAction: action,
        followUpDueDate: dueDate ? new Date(dueDate) : null,
        followUpMessage: message || null,
      },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        orgId,
        action: "follow_up_scheduled",
        metadata: {
          followUpAction: action,
          dueDate,
        },
      },
    });

    return NextResponse.json({ lead: updated });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
};

export const POST = requireAuth(handler);
