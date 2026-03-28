"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsAreaChart } from "./LeadsAreaChart";
import { LeadFunnelChart } from "./LeadFunnelChart";
import { ConversionTrendChart } from "./ConversionTrendChart";
import { CampaignROIChart } from "./CampaignROIChart";
import { LeadStatusChart } from "./LeadStatusChart";
import { Users, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface DashboardProps {
  totalLeads: number;
  leadsToday: number;
  leadsLast30: number;
  leadsChange: string | null;
  booked: number;
  closed: number;
  lost: number;
  contacted: number;
  newLeads: number;
  totalRevenue: number;
  revenueChange: string | null;
  conversionRate: string;
  chartData: {
    "7d": { date: string; leads: number }[];
    "30d": { date: string; leads: number }[];
    "3m": { date: string; leads: number }[];
  };
  leads: any[];
}

export function DashboardContent({
  totalLeads,
  leadsToday,
  leadsLast30,
  leadsChange,
  booked,
  closed,
  lost,
  contacted,
  newLeads,
  totalRevenue,
  revenueChange,
  conversionRate,
  chartData,
  leads,
}: DashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const changePercent = leadsChange ? parseFloat(leadsChange) : 0;
  const revenueChangePercent = revenueChange ? parseFloat(revenueChange) : 0;

  return (
    <div className="flex-1 bg-background overflow-y-auto fade-in">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-2">Welcome back! Here's your campaign performance.</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Leads Card */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary">Total Leads</CardTitle>
              <div className="icon-blue p-2 rounded-lg">
                <Users size={20} className="text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">{totalLeads}</div>
              <div className="flex items-center gap-2 mt-2">
                {changePercent >= 0 ? (
                  <>
                    <span className="text-success">↑</span>
                    <span className="text-success text-sm font-medium">{Math.abs(changePercent)}% from last month</span>
                  </>
                ) : (
                  <>
                    <span className="text-danger">↓</span>
                    <span className="text-danger text-sm font-medium">{Math.abs(changePercent)}% from last month</span>
                  </>
                )}
              </div>
              <p className="text-text-secondary text-sm mt-1">{leadsToday} today</p>
            </CardContent>
          </Card>

          {/* Conversion Rate Card */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary">Conversion Rate</CardTitle>
              <div className="icon-purple p-2 rounded-lg">
                <TrendingUp size={20} className="text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">{conversionRate}%</div>
              <p className="text-text-secondary text-sm mt-3">Leads to closed deals</p>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary">Total Revenue</CardTitle>
              <div className="icon-green p-2 rounded-lg">
                <DollarSign size={20} className="text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">{formatCurrency(totalRevenue)}</div>
              <div className="flex items-center gap-2 mt-2">
                {revenueChangePercent >= 0 ? (
                  <>
                    <span className="text-success">↑</span>
                    <span className="text-success text-sm font-medium">{Math.abs(revenueChangePercent)}% from last month</span>
                  </>
                ) : (
                  <>
                    <span className="text-danger">↓</span>
                    <span className="text-danger text-sm font-medium">{Math.abs(revenueChangePercent)}% from last month</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsAreaChart data={chartData["30d"]} />
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card className="card-hover mb-8">
          <CardHeader>
            <CardTitle>Lead Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">New</div>
                <div className="text-2xl font-bold text-text-primary">{newLeads}</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Contacted</div>
                <div className="text-2xl font-bold text-text-primary">{contacted}</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Booked</div>
                <div className="text-2xl font-bold text-text-primary">{booked}</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Closed</div>
                <div className="text-2xl font-bold text-success">{closed}</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Lost</div>
                <div className="text-2xl font-bold text-danger">{lost}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Lead Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadFunnelChart />
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Conversion Trend (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversionTrendChart />
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Lead Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadStatusChart />
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Campaign ROI</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignROIChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
