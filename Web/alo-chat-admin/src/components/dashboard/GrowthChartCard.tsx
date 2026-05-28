"use client";
import { useEffect, useState, useCallback } from "react";

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
} from "lucide-react";
import { userService } from "@/services/userService";

interface GrowthChartCardProps {
  totalUsers: number;
  initialData?: Record<string, number>;
}

export function GrowthChartCard({ totalUsers, initialData = {} }: GrowthChartCardProps) {
  const [range, setRange] = useState(7);
  const [data, setData] = useState<Record<string, number>>(initialData);
  const [loading, setLoading] = useState(false);

  // Sync with initialData if it changes (only for the 7-day default range)
  useEffect(() => {
    if (range === 7 && Object.keys(initialData).length > 0) {
      setData(initialData);
    }
  }, [initialData, range]);

  const fetchStats = useCallback(async (selectedRange: number) => {
    setLoading(true);
    try {
      const newData = await userService.getGrowthStats(selectedRange);
      setData(newData);
    } catch (error) {
      console.error("Failed to fetch growth stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRangeChange = (newRange: number) => {
    setRange(newRange);
    fetchStats(newRange);
  };

  // Use real data if available, otherwise generate mock for visualization
  const generateChartData = () => {
    if (Object.keys(data).length > 0 || range !== 7) {
      const result = [];
      const now = new Date();
      
      // Fill gaps with 0 for the selected range
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const count = data[dateStr] || 0;
        const dayName = d.toLocaleDateString('en-US', { 
          weekday: range <= 7 ? 'short' : undefined,
          day: '2-digit',
          month: '2-digit'
        });

        result.push({
          name: dayName,
          users: count,
          fullDate: dateStr
        });
      }
      return result;
    }

    // Fallback Mock (as before)
    const mockData = [];
    const base = totalUsers > 0 ? totalUsers : 1240000;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    for (let i = 0; i < 7; i++) {
      const dayOffset = 6 - i;
      const growthFactor = 1 - dayOffset * 0.02;
      mockData.push({
        name: days[i],
        users: Math.floor(base * growthFactor),
      });
    }
    return mockData;
  };

  const chartData = generateChartData();

  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-surface">
            User Growth & Activity
          </h3>
          <p className="text-sm font-medium text-on-surface-variant">
            Daily user registrations over the last {range} days.
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
            <DropdownMenuItem onClick={() => fetchStats(range)}>
              <RefreshCcwIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <span>Export as CSV</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Time Range</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => handleRangeChange(7)}
              className={range === 7 ? "bg-surface-container-low font-bold" : ""}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>Last 7 Days</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRangeChange(30)}
              className={range === 30 ? "bg-surface-container-low font-bold" : ""}
            >
              <CalendarIcon className={`mr-2 h-4 w-4 ${range === 30 ? '' : 'opacity-0'}`} />
              <span>Last 30 Days</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRangeChange(90)}
              className={range === 90 ? "bg-surface-container-low font-bold" : ""}
            >
              <CalendarIcon className={`mr-2 h-4 w-4 ${range === 90 ? '' : 'opacity-0'}`} />
              <span>Last 90 Days</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={`flex-1 w-full min-h-0 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
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

