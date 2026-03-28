import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/api-middleware";

async function verifyLeadAccess(id: string, orgId: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error("NOT_FOUND");
  if (lead.orgId !== orgId) throw new Error("FORBIDDEN");
  return lead;
}

async function handleRequest(request: NextRequest, context: any, params: { id: string }) {
  const { id } = params;
  const orgId = context.orgId;

  try {
    if (request.method === "GET") {
      const lead = await verifyLeadAccess(id, orgId);
      return NextResponse.json(lead);
    }

    if (request.method === "PATCH") {
      const lead = await verifyLeadAccess(id, orgId);
      const body = await request.json();

      if (body.bookingDate && typeof body.bookingDate === "string") {
        body.bookingDate = new Date(body.bookingDate);
      }
      if (body.saleAmount !== undefined) {
        body.saleAmount = body.saleAmount ? parseFloat(body.saleAmount) : null;
      }

      const updated = await prisma.lead.update({ where: { id }, data: body });
      return NextResponse.json(updated);
    }

    if (request.method === "DELETE") {
      const lead = await verifyLeadAccess(id, orgId);
      await prisma.lead.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const authHandler = requireAuth((req: NextRequest, context: any) => 
    handleRequest(req, context, resolvedParams)
  );
  return authHandler(request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const authHandler = requireAuth((req: NextRequest, context: any) => 
    handleRequest(req, context, resolvedParams)
  );
  return authHandler(request);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const authHandler = requireAuth((req: NextRequest, context: any) => 
    handleRequest(req, context, resolvedParams)
  );
  return authHandler(request);
}
