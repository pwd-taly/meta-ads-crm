"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Upload, ChevronDown } from "lucide-react";
import { Lead } from "@prisma/client";
import { WhatsAppButton } from "./WhatsAppButton";
import { CSVImportModal } from "./CSVImportModal";

const STATUSES = ["all", "new", "contacted", "booked", "closed", "lost"];
const STATUS_LABELS: Record<string, string> = {
  all: "All",
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

const statusVariant: Record<string, string> = {
  new: "default",
  contacted: "secondary",
  booked: "secondary",
  closed: "success",
  lost: "danger",
};

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-colors"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
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
          className="h-9 px-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all" className="bg-[#1a1a1a]">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
        </div>
      </div>

      {/* KPI Chips */}
      {!loading && leads.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1]">
            <span className="text-xs text-text-secondary">Total Leads</span>
            <div className="text-lg font-bold text-text-primary">{leads.length}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm text-zinc-400 font-medium">No leads found</p>
            <p className="text-xs text-zinc-600">Connect Meta or import a CSV to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead, index) => (
                    <TableRow key={lead.id} className="fade-in hover:bg-white/[0.03] transition-colors" style={{ animationDelay: `${index * 0.03}s` }}>
                      <TableCell className="font-medium text-text-primary">{lead.name}</TableCell>
                      <TableCell className="text-text-secondary">{lead.email || "—"}</TableCell>
                      <TableCell className="text-text-secondary">{lead.phone || "—"}</TableCell>
                      <TableCell className="text-sm text-text-secondary">{lead.campaignName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[lead.status] || "default"}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Link href={`/leads/${lead.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        {lead.phone && (
                          <WhatsAppButton
                            phone={lead.phone}
                            name={lead.name}
                            template={waTemplate}
                            templateEs={waTemplateEs}
                            size="sm"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
