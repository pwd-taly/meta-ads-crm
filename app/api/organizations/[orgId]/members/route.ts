import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;

  if (request.method === "GET") {
    const members = await prisma.organizationMember.findMany({
      where: { orgId },
      include: {
        user: { select: { email: true } },
      },
    });

    const formatted = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json({ members: formatted });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
};

export const GET = requireAuth(handler);
