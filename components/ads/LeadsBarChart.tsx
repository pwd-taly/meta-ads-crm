"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDateShort } from "@/lib/utils";

interface Props {
  data: { date: string; leads: number }[];
}

export function LeadsBarChart({ data }: Props) {
  if (!data?.length) return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(v: number) => [v, "Leads"]}
          labelFormatter={formatDateShort}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="leads" fill="#22C55E" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
