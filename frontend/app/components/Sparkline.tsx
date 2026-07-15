"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface SparklineProps {
  data: number[];
  isPositive: boolean;
}

export default function Sparkline({ data, isPositive }: SparklineProps) {
  // Format data for Recharts
  const chartData = data.map((val, idx) => ({ value: val, index: idx }));
  
  const color = isPositive ? "#10b981" : "#ef4444";
  const fillId = `sparkline-gradient-${isPositive ? "green" : "red"}`;

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
