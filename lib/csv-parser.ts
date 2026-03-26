import Papa from "papaparse";

export interface ParsedLead {
  metaLeadId?: string;
  name: string;
  email?: string;
  phone?: string;
  campaignName?: string;
  adsetName?: string;
  adName?: string;
  formName?: string;
  source: "csv";
}

// Maps Meta's CSV export column names to our fields
const FIELD_MAP: Record<string, keyof ParsedLead> = {
  "full name": "name",
  "full_name": "name",
  name: "name",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  "phone_number": "phone",
  "campaign name": "campaignName",
  campaign: "campaignName",
  "ad set name": "adsetName",
  "adset name": "adsetName",
  "ad name": "adName",
  ad: "adName",
  "form name": "formName",
  "lead id": "metaLeadId",
  "id": "metaLeadId",
};

export function parseMetaLeadsCSV(csvText: string): ParsedLead[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return (result.data as Record<string, string>[])
    .map((row) => {
      const lead: Partial<ParsedLead> = { source: "csv" };
      for (const [col, val] of Object.entries(row)) {
        const field = FIELD_MAP[col.trim().toLowerCase()];
        if (field && val?.trim()) {
          (lead as Record<string, unknown>)[field] = val.trim();
        }
      }
      return lead as ParsedLead;
    })
    .filter((l) => l.name);
}
