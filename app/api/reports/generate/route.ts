import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-middleware";
import { generateReportData } from "@/lib/jobs/report-generator";
import { generateReportPDF } from "@/lib/reports/report-pdf";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;
  const { startDate, endDate } = await request.json();

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const reportData = await generateReportData(orgId, start, end);
    const pdfBuffer = await generateReportPDF(reportData);
    const pdfBytes = new Uint8Array(pdfBuffer);

    const filename = `crm-report-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
};

export const POST = requireAuth(handler);
