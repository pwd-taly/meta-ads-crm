import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-middleware";
import { generateReportData, formatReportAsHTML } from "@/lib/jobs/report-generator";

const handler = async (request: NextRequest, context: any) => {
  const { orgId } = context.params;
  const { startDate, endDate } = await request.json();

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const reportData = await generateReportData(orgId, start, end);
    const html = formatReportAsHTML(reportData);

    // TODO: Use a PDF library like puppeteer or html2pdf to generate actual PDF
    // For MVP, return HTML
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": "attachment; filename=report.html",
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
