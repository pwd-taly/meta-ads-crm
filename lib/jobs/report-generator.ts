import { prisma } from "@/lib/db";

export interface ReportData {
  orgId: string;
  startDate: Date;
  endDate: Date;
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  conversionRate: number;
  topCampaigns: Array<{
    name: string;
    conversions: number;
    spend: number;
    roi: number;
  }>;
}

export async function generateReportData(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<ReportData> {
  // Get total leads
  const totalLeads = await prisma.lead.count({
    where: {
      orgId,
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // Get leads by status
  const statuses = ["new", "contacted", "booked", "closed", "lost"] as const;
  const leadsByStatus: Record<string, number> = {};

  for (const status of statuses) {
    leadsByStatus[status] = await prisma.lead.count({
      where: {
        orgId,
        status: status as any, // Type cast for Prisma query
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  // Calculate conversion rate
  const converted = leadsByStatus["closed"] || 0;
  const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;

  // Get top campaigns
  const campaigns = await prisma.campaign.findMany({
    where: {
      orgId,
      syncedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { conversions: "desc" },
    take: 5,
  });

  const topCampaigns = campaigns.map((c) => ({
    name: c.name,
    conversions: c.conversions || 0,
    spend: c.spend || 0,
    roi: c.spend ? ((c.conversions || 0) / c.spend) * 100 : 0,
  }));

  return {
    orgId,
    startDate,
    endDate,
    totalLeads,
    leadsByStatus,
    conversionRate,
    topCampaigns,
  };
}

export function formatReportAsHTML(data: ReportData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CRM Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <h1>CRM Performance Report</h1>
      <p>Period: ${data.startDate.toDateString()} - ${data.endDate.toDateString()}</p>

      <h2>Summary</h2>
      <table>
        <tr>
          <th>Total Leads</th>
          <th>Converted</th>
          <th>Conversion Rate</th>
        </tr>
        <tr>
          <td>${data.totalLeads}</td>
          <td>${data.leadsByStatus.closed || 0}</td>
          <td>${data.conversionRate.toFixed(2)}%</td>
        </tr>
      </table>

      <h2>Top Campaigns</h2>
      <table>
        <tr>
          <th>Campaign</th>
          <th>Conversions</th>
          <th>Spend</th>
          <th>ROI</th>
        </tr>
        ${data.topCampaigns.map((c) => `
          <tr>
            <td>${c.name}</td>
            <td>${c.conversions}</td>
            <td>$${c.spend.toFixed(2)}</td>
            <td>${c.roi.toFixed(2)}%</td>
          </tr>
        `).join("")}
      </table>
    </body>
    </html>
  `;
}

export function formatReportAsCSV(data: ReportData): string {
  const lines = [
    ["CRM Performance Report"],
    [`Period: ${data.startDate.toDateString()} - ${data.endDate.toDateString()}`],
    [],
    ["Summary"],
    ["Total Leads", "Converted", "Conversion Rate %"],
    [data.totalLeads, data.leadsByStatus.closed || 0, data.conversionRate.toFixed(2)],
    [],
    ["Top Campaigns"],
    ["Campaign Name", "Conversions", "Spend", "ROI %"],
    ...data.topCampaigns.map((c) => [
      c.name,
      c.conversions,
      c.spend.toFixed(2),
      c.roi.toFixed(2),
    ]),
  ];

  return lines.map((row) => row.map((val) => `"${val}"`).join(",")).join("\n");
}
