import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseMetaLeadsCSV } from "@/lib/csv-parser";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
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
    await prisma.lead.create({ data: lead });
    imported++;
  }

  return NextResponse.json({ imported, skipped, total: parsed.length });
}
