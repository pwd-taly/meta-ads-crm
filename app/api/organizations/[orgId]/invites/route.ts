import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/api-middleware";
import crypto from "crypto";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;
  const { email, role } = await request.json();

  if (request.method === "POST") {
    // Verify org exists and user is admin
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }

    // Check if user already in org
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        org: { id: orgId },
        user: { email },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User already in organization" },
        { status: 400 }
      );
    }

    // TODO: In production, create an Invite record in database and send email
    // For MVP, we'll just create the member directly with a placeholder
    const token = crypto.randomBytes(16).toString("hex");

    // Create member
    const user = await prisma.user.findUnique({
      where: { email },
    });

    let member;
    if (user) {
      // User exists, add to org
      member = await prisma.organizationMember.create({
        data: {
          userId: user.id,
          orgId,
          role,
        },
      });
    } else {
      // User doesn't exist, would need to create via registration
      // For now, return error
      return NextResponse.json(
        { error: "User not found. They must register first." },
        { status: 404 }
      );
    }

    // TODO: Send email with invite link
    // sendEmail({ to: email, inviteLink: `/invite/${token}` })

    return NextResponse.json({
      success: true,
      member,
      message: "Invite sent (email sending not yet implemented)",
    });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
};

export const POST = requireRole("admin", handler);
