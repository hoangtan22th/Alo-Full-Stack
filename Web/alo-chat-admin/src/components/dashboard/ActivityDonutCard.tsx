"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ActivityDonutCardProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  "#0ea5e9", // Sky Blue
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#6366f1", // Indigo
];

export function ActivityDonutCard({ data }: ActivityDonutCardProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col h-[400px]">
      <div className="mb-2">
        <h3 className="text-xl font-bold text-on-surface">Report Distribution</h3>
        <p className="text-sm font-medium text-on-surface-variant">
          Distribution by violation category.
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length > 0 ? data : [{ name: "No data", value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              {data.length === 0 && <Cell fill="var(--color-surface-container-high)" />}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface-container-lowest)",
                borderRadius: "12px",
                border: "1px solid var(--color-surface-container-low)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-on-surface">
            {total.toLocaleString()}
          </span>
          <span className="text-xs font-medium text-on-surface-variant">
            Total Reports
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2 overflow-y-auto max-h-[120px] pr-2 custom-scrollbar">
        {data.length > 0 ? (
          data.slice(0, 4).map((item, index) => (
            <LegendItem
              key={item.name}
              color={COLORS[index % COLORS.length]}
              label={item.name}
              value={`${((item.value / total) * 100).toFixed(1)}%`}
            />
          ))
        ) : (
          <p className="text-center text-sm italic text-on-surface-variant">
            No report data available
          </p>
        )}
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 truncate mr-2">
        <span 
          className="w-2 h-2 rounded-full shrink-0" 
          style={{ backgroundColor: color }}
        ></span>
        <span className="font-medium text-on-surface truncate">{label}</span>
      </div>
      <span className="font-bold text-on-surface shrink-0">{value}</span>
    </div>
  );
}

