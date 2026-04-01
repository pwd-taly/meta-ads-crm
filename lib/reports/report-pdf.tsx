import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { ReportData } from "@/lib/jobs/report-generator";

const BRAND = "#4F46E5"; // indigo-600

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#1F2937",
  },
  header: {
    marginBottom: 20,
    borderBottom: `2px solid ${BRAND}`,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6B7280",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottom: `1px solid #E5E7EB`,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  card: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    padding: 10,
    border: `1px solid #E5E7EB`,
  },
  cardLabel: {
    fontSize: 8,
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  table: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `1px solid #E5E7EB`,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: BRAND,
    borderRadius: 2,
    marginBottom: 1,
  },
  tableHeader: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    padding: "5 8",
    flex: 1,
  },
  tableCell: {
    fontSize: 9,
    padding: "5 8",
    flex: 1,
    color: "#374151",
  },
  tableCellAlt: {
    fontSize: 9,
    padding: "5 8",
    flex: 1,
    color: "#374151",
    backgroundColor: "#F9FAFB",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9CA3AF",
    borderTop: `1px solid #E5E7EB`,
    paddingTop: 6,
  },
});

function SummaryCards({ data }: { data: ReportData }) {
  return (
    <View style={styles.cardRow}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Leads</Text>
        <Text style={styles.cardValue}>{data.totalLeads}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Converted</Text>
        <Text style={styles.cardValue}>{data.leadsByStatus.closed || 0}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Conversion Rate</Text>
        <Text style={styles.cardValue}>{data.conversionRate.toFixed(1)}%</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Contacted</Text>
        <Text style={styles.cardValue}>{data.leadsByStatus.contacted || 0}</Text>
      </View>
    </View>
  );
}

function LeadsByStatusTable({ data }: { data: ReportData }) {
  const statuses = [
    { key: "new", label: "New" },
    { key: "contacted", label: "Contacted" },
    { key: "booked", label: "Booked" },
    { key: "closed", label: "Closed (Won)" },
    { key: "lost", label: "Lost" },
  ];
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.tableHeader}>Status</Text>
        <Text style={styles.tableHeader}>Count</Text>
        <Text style={styles.tableHeader}>% of Total</Text>
      </View>
      {statuses.map((s, i) => {
        const count = data.leadsByStatus[s.key] || 0;
        const pct =
          data.totalLeads > 0
            ? ((count / data.totalLeads) * 100).toFixed(1)
            : "0.0";
        return (
          <View key={s.key} style={styles.tableRow}>
            <Text style={i % 2 === 0 ? styles.tableCell : styles.tableCellAlt}>
              {s.label}
            </Text>
            <Text style={i % 2 === 0 ? styles.tableCell : styles.tableCellAlt}>
              {count}
            </Text>
            <Text style={i % 2 === 0 ? styles.tableCell : styles.tableCellAlt}>
              {pct}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TopCampaignsTable({ data }: { data: ReportData }) {
  if (data.topCampaigns.length === 0) {
    return (
      <Text style={{ fontSize: 9, color: "#6B7280" }}>
        No campaign data for this period.
      </Text>
    );
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeader, { flex: 2 }]}>Campaign</Text>
        <Text style={styles.tableHeader}>Conversions</Text>
        <Text style={styles.tableHeader}>Spend</Text>
        <Text style={styles.tableHeader}>ROI</Text>
      </View>
      {data.topCampaigns.map((c, i) => (
        <View key={c.name} style={styles.tableRow}>
          <Text
            style={
              i % 2 === 0
                ? [styles.tableCell, { flex: 2 }]
                : [styles.tableCellAlt, { flex: 2 }]
            }
          >
            {c.name}
          </Text>
          <Text style={i % 2 === 0 ? styles.tableCell : styles.tableCellAlt}>
            {c.conversions}
          </Text>
          <Text style={i % 2 === 0 ? styles.tableCell : styles.tableCellAlt}>
            ${c.spend.toFixed(2)}
          </Text>
          <Text style={i % 2 === 0 ? styles.tableCell : styles.tableCellAlt}>
            {c.roi.toFixed(1)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ data }: { data: ReportData }) {
  const generatedAt = new Date().toLocaleString();
  const period = `${data.startDate.toDateString()} – ${data.endDate.toDateString()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CRM Performance Report</Text>
          <Text style={styles.subtitle}>Period: {period}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <SummaryCards data={data} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leads by Status</Text>
          <LeadsByStatusTable data={data} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Campaigns</Text>
          <TopCampaignsTable data={data} />
        </View>

        <View style={styles.footer} fixed>
          <Text>Meta Ads CRM • Confidential</Text>
          <Text>Generated {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
