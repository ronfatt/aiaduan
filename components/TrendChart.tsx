"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TrendChart({ data }: { data: Array<{ day: string; complaints: number }> }) {
  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D6BFF" stopOpacity={0.38} />
            <stop offset="100%" stopColor="#2D6BFF" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
        <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
        <Tooltip
          contentStyle={{
            borderRadius: 14,
            border: "1px solid #dbeafe",
            boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
          }}
          labelStyle={{ color: "#0f172a", fontWeight: 800 }}
        />
        <Area
          type="monotone"
          dataKey="complaints"
          stroke="#1d4ed8"
          strokeWidth={3}
          fill="url(#trendFill)"
          dot={{ r: 3, strokeWidth: 2, fill: "#ffffff", stroke: "#1d4ed8" }}
          activeDot={{ r: 5, strokeWidth: 2, fill: "#ffffff", stroke: "#1d4ed8" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
