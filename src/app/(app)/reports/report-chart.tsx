"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatFRWCompact, formatFRW } from "@/lib/currency";

type Row = {
  date: string;
  sales: number;
  purchases: number;
  expenses: number;
  net: number;
};

export function ReportChart({ data }: { data: Row[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const enriched = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "d MMM"),
  }));

  if (!mounted) return <div className="h-80 w-full" />;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={enriched}
          margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatFRWCompact(v).replace("FRW ", "")}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatFRW(Number(value)),
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Bar
            dataKey="sales"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            name="Sales"
          />
          <Bar
            dataKey="purchases"
            fill="var(--chart-3)"
            radius={[4, 4, 0, 0]}
            name="Purchases"
          />
          <Bar
            dataKey="expenses"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
            name="Expenses"
          />
          <Line
            type="monotone"
            dataKey="net"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={{ r: 2 }}
            name="Net"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
