"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FunnelData {
  stage: string;
  count: number;
}

export function LeadFunnelChart() {
  const [data, setData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/lead-funnel");
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result.funnel || []);
      } catch (error) {
        console.error("Error fetching funnel data:", error);
        // Fallback: empty state
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
        <p className="text-gray-500">No funnel data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
