"use client";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#1877F2", "#22C55E", "#EAB308", "#A855F7", "#EF4444", "#14B8A6", "#F97316"];

interface Props {
  data: { name: string; value: number }[];
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#d4d4d8",
};

export function SpendByCampaignDonut({ data }: Props) {
  if (!data?.length) return <div className="h-48 flex items-center justify-center text-sm text-zinc-600">No spend data</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [formatCurrency(v), "Spend"]}
          contentStyle={tooltipStyle}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v: string) => (
            <span style={{ fontSize: 11, color: "#71717a" }}>{v.length > 20 ? v.slice(0, 20) + "…" : v}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
