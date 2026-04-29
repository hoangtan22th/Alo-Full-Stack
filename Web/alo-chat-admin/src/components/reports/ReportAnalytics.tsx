"use client";

import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  NoSymbolIcon, 
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { reportService } from '@/services/reportService';

const COLORS = ['#0ea5e9', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

interface StatisticsData {
  overview: {
    totalPending: number;
    resolvedToday: number;
    totalBanned: number;
  };
  byReason: { name: string; value: number }[];
  byTargetType: { name: string; value: number }[];
  topOffenders: {
    targetId: string;
    targetName: string;
    targetType: string;
    pendingCount: number;
  }[];
}

export default function ReportAnalytics() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await reportService.getStatistics();
        if (stats) {
          setData(stats);
        }
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-surface-container rounded-3xl border border-outline-variant/10" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 mb-10">
      {/* ── OVERVIEW CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Pending */}
        <div className="relative overflow-hidden bg-primary/5 border border-primary/10 p-6 rounded-[2rem] group transition-all hover:shadow-lg hover:shadow-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-1">Đang chờ xử lý</p>
              <h3 className="text-4xl font-headline font-black text-primary">{data.overview.totalPending}</h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-2xl">
              <ClockIcon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <ClockIcon className="w-24 h-24 text-primary" />
          </div>
        </div>

        {/* Resolved Today */}
        <div className="relative overflow-hidden bg-secondary/5 border border-secondary/10 p-6 rounded-[2rem] group transition-all hover:shadow-lg hover:shadow-secondary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary/70 mb-1">Xử lý hôm nay</p>
              <h3 className="text-4xl font-headline font-black text-secondary">{data.overview.resolvedToday}</h3>
            </div>
            <div className="p-3 bg-secondary/10 rounded-2xl">
              <ShieldCheckIcon className="w-8 h-8 text-secondary" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheckIcon className="w-24 h-24 text-secondary" />
          </div>
        </div>

        {/* Total Banned */}
        <div className="relative overflow-hidden bg-error/5 border border-error/10 p-6 rounded-[2rem] group transition-all hover:shadow-lg hover:shadow-error/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-error/70 mb-1">Tổng số đã BAN</p>
              <h3 className="text-4xl font-headline font-black text-error">{data.overview.totalBanned}</h3>
            </div>
            <div className="p-3 bg-error/10 rounded-2xl">
              <NoSymbolIcon className="w-8 h-8 text-error" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <NoSymbolIcon className="w-24 h-24 text-error" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── CHARTS SECTION ── */}
        <div className="space-y-8">
          {/* Reason Distribution */}
          <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ChartPieIcon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-headline font-bold text-lg text-on-surface">Phân phối theo lý do</h4>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byReason}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.byReason.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Target Type Comparison */}
          <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-secondary/10 rounded-xl">
                <PresentationChartBarIcon className="w-5 h-5 text-secondary" />
              </div>
              <h4 className="font-headline font-bold text-lg text-on-surface">Người dùng vs Nhóm</h4>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byTargetType}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── TOP OFFENDERS LIST ── */}
        <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-error/10 rounded-xl">
                <ExclamationTriangleIcon className="w-5 h-5 text-error" />
              </div>
              <h4 className="font-headline font-bold text-lg text-on-surface">Top vi phạm chờ xử lý</h4>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
              Cần ưu tiên
            </span>
          </div>

          <div className="space-y-4">
            {data.topOffenders.length > 0 ? data.topOffenders.map((offender, idx) => (
              <div key={offender.targetId} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-full font-headline font-black text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {idx + 1}
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-on-surface">{offender.targetName}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        offender.targetType === 'USER' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {offender.targetType}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono">ID: {offender.targetId.slice(-6)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-headline font-black text-error">{offender.pendingCount}</p>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">Báo cáo</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant italic">
                 <ShieldCheckIcon className="w-12 h-12 mb-2 opacity-20" />
                 <p className="text-sm">Hiện chưa có đối tượng vi phạm nổi bật</p>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
             <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-xs text-amber-700 leading-relaxed">
               <strong>Lưu ý:</strong> Danh sách này tổng hợp dựa trên số lượng báo cáo "Đang chờ xử lý". Các đối tượng này có thể đang gây ảnh hưởng xấu trên diện rộng.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
