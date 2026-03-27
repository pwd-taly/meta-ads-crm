"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDateShort } from "@/lib/utils";

interface Props {
  data: { date: string; cpl: number }[];
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#d4d4d8",
};

export function CPLTrendChart({ data }: Props) {
  const filtered = data?.filter((d) => d.cpl > 0);
  if (!filtered?.length) return <div className="h-48 flex items-center justify-center text-sm text-zinc-600">No CPL data (no leads recorded)</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={filtered} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => [`$${v.toFixed(2)}`, "CPL"]}
          labelFormatter={formatDateShort}
          contentStyle={tooltipStyle}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <Line type="monotone" dataKey="cpl" stroke="#EF4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
