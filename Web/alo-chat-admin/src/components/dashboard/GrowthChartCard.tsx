"use client";

import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  DownloadIcon, 
  RefreshCcwIcon, 
  CalendarIcon,
  ChevronDownIcon
} from "lucide-react";

interface GrowthChartCardProps {
  totalUsers: number;
}

export function GrowthChartCard({ totalUsers }: GrowthChartCardProps) {
  // Generate mock historical data based on current totalUsers
  const generateData = () => {
    const data = [];
    const base = totalUsers > 0 ? totalUsers : 1240000;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    for (let i = 0; i < 7; i++) {
      const dayOffset = 6 - i;
      const growthFactor = 1 - dayOffset * 0.02; // Roughly 2% growth per day
      data.push({
        name: days[i],
        users: Math.floor(base * growthFactor),
      });
    }
    return data;
  };

  const chartData = generateData();

  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-surface">
            User Growth & Activity
          </h3>
          <p className="text-sm font-medium text-on-surface-variant">
            Daily active users over the last 7 days.
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant cursor-pointer outline-none">
              <EllipsisVerticalIcon className="w-6 h-6" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Chart Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.reload()}>
              <RefreshCcwIcon className="mr-2 h-4 w-4" />
              <span>Refresh Stats</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <span>Export as CSV</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Time Range</DropdownMenuLabel>
            <DropdownMenuItem className="bg-surface-container-low">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>Last 7 Days</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CalendarIcon className="mr-2 h-4 w-4 opacity-0" />
              <span>Last 30 Days</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CalendarIcon className="mr-2 h-4 w-4 opacity-0" />
              <span>Last 90 Days</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="var(--color-surface-container-high)" 
            />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)", fontWeight: 500 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "var(--color-on-surface-variant)", fontWeight: 500 }}
              tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${value / 1000}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface-container-lowest)",
                borderRadius: "12px",
                border: "1px solid var(--color-surface-container-low)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                fontSize: "12px",
                fontWeight: "bold",
              }}
              itemStyle={{ color: "#0ea5e9" }}
              cursor={{ stroke: "#0ea5e9", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#0ea5e9"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorUsers)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

