import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;

  if (request.method === "GET") {
    const accounts = await prisma.metaAdAccount.findMany({
      where: { orgId },
      select: {
        id: true,
        metaAdAccountId: true,
        metaPageId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ accounts });
  }

  if (request.method === "POST") {
    const { metaAccessToken, metaAdAccountId, metaPageId } =
      await request.json();

    // TODO: Validate token with Meta API before saving
    // For MVP, skip validation

    const account = await prisma.metaAdAccount.create({
      data: {
        orgId,
        metaAccessToken,
        metaAdAccountId,
        metaPageId: metaPageId || null,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
};

export const GET = requireRole("admin", handler);
export const POST = requireRole("admin", handler);
