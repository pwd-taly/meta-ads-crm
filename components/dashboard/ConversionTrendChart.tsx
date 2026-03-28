"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  date: string;
  conversionRate: number;
}

export function ConversionTrendChart() {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/conversion-trend");
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result.trend || []);
      } catch (error) {
        console.error("Error fetching trend data:", error);
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
        <p className="text-gray-500">No trend data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: "Conversion Rate (%)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Line type="monotone" dataKey="conversionRate" stroke="#10b981" name="Conversion Rate" />
      </LineChart>
    </ResponsiveContainer>
  );
}
