"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Defs, LinearGradient, Stop,
} from "recharts";
import { formatDateShort } from "@/lib/utils";

interface Props {
  data: { date: string; spend: number }[];
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#d4d4d8",
};

export function SpendLineChart({ data }: Props) {
  if (!data?.length) return <div className="h-60 flex items-center justify-center text-sm text-zinc-600">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
        <Defs>
          <LinearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1877F2" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#1877F2" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => [`$${v.toFixed(2)}`, "Spend"]}
          labelFormatter={formatDateShort}
          contentStyle={tooltipStyle}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <Area type="monotone" dataKey="spend" stroke="#1877F2" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
