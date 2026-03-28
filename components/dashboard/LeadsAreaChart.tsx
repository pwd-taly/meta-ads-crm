"use client";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

interface Props {
  data: { date: string; leads: number }[];
}

export function LeadsAreaChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1877F2" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1877F2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12, color: "#fff" }}
          formatter={(v: number) => [v.toString(), "Leads"]}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <Area type="monotone" dataKey="leads" stroke="#1877F2" strokeWidth={2} fill="url(#leadGradient)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
