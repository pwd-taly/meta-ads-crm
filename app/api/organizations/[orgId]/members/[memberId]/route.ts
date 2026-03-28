import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { memberId } = context.params;

  if (request.method === "DELETE") {
    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
};

export const DELETE = requireRole("admin", handler);
