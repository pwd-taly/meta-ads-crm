"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDateShort } from "@/lib/utils";

interface Props {
  data: { date: string; cpl: number }[];
}

export function CPLTrendChart({ data }: Props) {
  const filtered = data?.filter((d) => d.cpl > 0);
  if (!filtered?.length) return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No CPL data (no leads recorded)</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={filtered} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          formatter={(v: number) => [`$${v.toFixed(2)}`, "CPL"]}
          labelFormatter={formatDateShort}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Line type="monotone" dataKey="cpl" stroke="#EF4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
