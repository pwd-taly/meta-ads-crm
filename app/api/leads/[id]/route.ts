import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Convert bookingDate string to Date if provided
  if (body.bookingDate && typeof body.bookingDate === "string") {
    body.bookingDate = new Date(body.bookingDate);
  }
  if (body.saleAmount !== undefined) {
    body.saleAmount = body.saleAmount ? parseFloat(body.saleAmount) : null;
  }

  const lead = await prisma.lead.update({ where: { id }, data: body });
  return NextResponse.json(lead);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
