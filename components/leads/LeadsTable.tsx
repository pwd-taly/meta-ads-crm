"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Upload, Plus, ChevronDown } from "lucide-react";
import { Lead } from "@prisma/client";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { WhatsAppButton } from "./WhatsAppButton";
import { CSVImportModal } from "./CSVImportModal";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const STATUSES = ["all", "new", "contacted", "booked", "closed", "lost"];
const STATUS_LABELS: Record<string, string> = {
  all: "All Status",
  new: "New",
  contacted: "Contacted",
  booked: "Booked",
  closed: "Closed",
  lost: "Lost",
};

interface Props {
  initialLeads: Lead[];
  campaigns: string[];
  waTemplate: string;
  waTemplateEs: string;
}

export function LeadsTable({ initialLeads, campaigns, waTemplate, waTemplateEs }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async (s = search, st = statusFilter, c = campaignFilter) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (st !== "all") params.set("status", st);
    if (c !== "all") params.set("campaign", c);
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads);
    setLoading(false);
  }, [search, statusFilter, campaignFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchLeads(e.target.value, statusFilter, campaignFilter);
  };

  const handleStatusFilter = (st: string) => {
    setStatusFilter(st);
    fetchLeads(search, st, campaignFilter);
  };

  const handleCampaignFilter = (c: string) => {
    setCampaignFilter(c);
    fetchLeads(search, statusFilter, c);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 h-9 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Campaign filter */}
        <select
          value={campaignFilter}
          onChange={(e) => handleCampaignFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="all">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm hover:bg-muted transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No leads found. Connect Meta or import a CSV.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Ad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <Link href={`/leads/${lead.id}`} className="font-medium hover:text-primary">
                            {lead.name}
                          </Link>
                          {lead.email && (
                            <p className="text-xs text-muted-foreground">{lead.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <span className="truncate block max-w-[150px]">
                        {lead.campaignName || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      <span className="truncate block max-w-[120px]">
                        {lead.adName || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        disabled={updatingId === lead.id}
                        className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white cursor-pointer"
                      >
                        {["new", "contacted", "booked", "closed", "lost"].map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {lead.phone && (
                          <WhatsAppButton
                            phone={lead.phone}
                            name={lead.name}
                            template={waTemplate}
                            templateEs={waTemplateEs}
                            size="sm"
                          />
                        )}
                        <Link
                          href={`/leads/${lead.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="View detail"
                        >
                          <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImport && (
        <CSVImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            fetchLeads();
          }}
        />
      )}
    </div>
  );
}
