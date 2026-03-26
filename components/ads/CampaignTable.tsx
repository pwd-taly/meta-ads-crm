"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  leads: number;
  cpl: number;
}

interface Props {
  campaigns: Campaign[];
}

const statusDot: Record<string, string> = {
  ACTIVE: "bg-green-500",
  PAUSED: "bg-yellow-400",
  ARCHIVED: "bg-gray-400",
};

export function CampaignTable({ campaigns }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!campaigns.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No campaign data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Campaign</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Spend</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Impressions</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Clicks</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Leads</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">CPL</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">CTR</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {campaigns.map((c) => (
            <>
              <tr
                key={c.id}
                className="hover:bg-muted/20 cursor-pointer transition-colors"
                onClick={() => toggle(c.id)}
              >
                <td className="px-4 py-3">
                  {expanded.has(c.id) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[c.status] || "bg-gray-400"}`}
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.spend)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{formatNumber(c.impressions)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{formatNumber(c.clicks)}</td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="font-medium text-green-600">{c.leads}</span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                  {c.cpl > 0 ? formatCurrency(c.cpl) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                  {c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : "—"}
                </td>
              </tr>
              {expanded.has(c.id) && (
                <tr key={`${c.id}-exp`}>
                  <td colSpan={8} className="px-4 py-3 bg-muted/10">
                    <AdSetsExpanded campaignId={c.id} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdSetsExpanded({ campaignId }: { campaignId: string }) {
  return (
    <div className="pl-6 py-2 text-xs text-muted-foreground">
      <p className="italic">
        Ad set breakdown requires a separate Meta API call. Click to expand — ad sets will load when you connect your Meta account with the required permissions.
      </p>
    </div>
  );
}
