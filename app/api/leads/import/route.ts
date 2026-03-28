import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMetaLeadsCSV } from "@/lib/csv-parser";
import { requireAuth } from "@/lib/api-middleware";

const handler = async (request: NextRequest, context: any) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const preview = formData.get("preview") === "true";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const parsed = parseMetaLeadsCSV(text);

  if (preview) {
    return NextResponse.json({ leads: parsed.slice(0, 10), total: parsed.length });
  }

  let imported = 0;
  let skipped = 0;

  for (const lead of parsed) {
    if (lead.metaLeadId) {
      const exists = await prisma.lead.findUnique({
        where: { metaLeadId: lead.metaLeadId },
      });
      if (exists) { skipped++; continue; }
    }
    const leadData = { ...lead, orgId: context.orgId };
    await prisma.lead.create({ data: leadData });
    imported++;
  }

  return NextResponse.json({ imported, skipped, total: parsed.length });
};

export const POST = requireAuth(handler);
