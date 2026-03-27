"use client";
import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, MousePointer, Users, AlertCircle, RefreshCw } from "lucide-react";
import { SpendLineChart } from "./SpendLineChart";
import { LeadsBarChart } from "./LeadsBarChart";
import { SpendByCampaignDonut } from "./SpendByCampaignDonut";
import { CPLTrendChart } from "./CPLTrendChart";
import { CampaignTable } from "./CampaignTable";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";

const DATE_PRESETS = [
  { value: "last_7d", label: "7 Days" },
  { value: "last_14d", label: "14 Days" },
  { value: "last_30d", label: "30 Days" },
  { value: "this_month", label: "This Month" },
];

interface AdsData {
  campaigns: Campaign[];
  totals: Totals;
  daily: DailyEntry[];
  spendByCampaign: { name: string; value: number }[];
}

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

interface Totals {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  reach: number;
  cpl: number;
  ctr: number;
}

interface DailyEntry {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
}

interface Props {
  hasCredentials: boolean;
}

export function AdsAnalyticsClient({ hasCredentials }: Props) {
  const [datePreset, setDatePreset] = useState("last_30d");
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (preset = datePreset) => {
    if (!hasCredentials) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/ads?datePreset=${preset}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [hasCredentials]);

  if (!hasCredentials) {
    return (
      <div className="bg-[#111113] rounded-3xl border border-white/[0.06] p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-yellow-500" />
        </div>
        <p className="font-medium text-white">Meta credentials not configured</p>
        <p className="text-sm text-zinc-500">
          Add your Meta Access Token and Ad Account ID in Settings to see live data.
        </p>
        <Link
          href="/settings"
          className="btn-gradient inline-block mt-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setDatePreset(p.value);
                fetchData(p.value);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                datePreset === p.value
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.08] rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="py-20 text-center text-sm text-zinc-500">
          Fetching data from Meta…
        </div>
      )}

      {data && (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Spend",  value: formatCurrency(data.totals.spend),        icon: DollarSign,   iconBg: "bg-blue-500/10 border border-blue-500/20",    iconColor: "text-blue-400" },
              { label: "Impressions",  value: formatNumber(data.totals.impressions),     icon: TrendingUp,   iconBg: "bg-purple-500/10 border border-purple-500/20", iconColor: "text-purple-400" },
              { label: "Clicks",       value: formatNumber(data.totals.clicks),          icon: MousePointer, iconBg: "bg-orange-500/10 border border-orange-500/20", iconColor: "text-orange-400" },
              { label: "Leads",        value: formatNumber(data.totals.leads),           icon: Users,        iconBg: "bg-emerald-500/10 border border-emerald-500/20", iconColor: "text-emerald-400" },
              { label: "Avg CPL",      value: formatCurrency(data.totals.cpl),           icon: DollarSign,   iconBg: "bg-red-500/10 border border-red-500/20",      iconColor: "text-red-400" },
              { label: "Avg CTR",      value: `${data.totals.ctr.toFixed(2)}%`,          icon: TrendingUp,   iconBg: "bg-teal-500/10 border border-teal-500/20",    iconColor: "text-teal-400" },
            ].map((s) => (
              <div key={s.label} className="bg-[#111113] rounded-2xl border border-white/[0.06] p-4 card-hover">
                <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Spend Over Time</h3>
              <SpendLineChart data={data.daily} />
            </div>
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Leads Over Time</h3>
              <LeadsBarChart data={data.daily} />
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white mb-4">CPL Trend</h3>
              <CPLTrendChart data={data.daily} />
            </div>
            <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Spend by Campaign</h3>
              <SpendByCampaignDonut data={data.spendByCampaign} />
            </div>
          </div>

          {/* Campaign Table */}
          <div className="bg-[#111113] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Campaigns</h3>
            </div>
            <CampaignTable campaigns={data.campaigns} />
          </div>
        </>
      )}
    </div>
  );
}
