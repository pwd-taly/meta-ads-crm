"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ROIData {
  name: string;
  roi: number;
}

export function CampaignROIChart() {
  const [data, setData] = useState<ROIData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/campaign-roi");
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result.campaigns || []);
      } catch (error) {
        console.error("Error fetching ROI data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="h-80 bg-gray-200 animate-pulse rounded" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        <p className="text-gray-500">No campaign data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="roi" fill="#8b5cf6" name="ROI Multiplier" />
      </BarChart>
    </ResponsiveContainer>
  );
}
