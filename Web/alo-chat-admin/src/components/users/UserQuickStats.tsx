"use client";

import React, { useEffect, useState } from "react";
import {
  UsersIcon,
  UserPlusIcon,
  SignalIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { userService } from "@/services/userService";

interface QuickStats {
  totalUsers: number;
  newToday: number;
  onlineNow: number;
  bannedUsers: number;
}

export const UserQuickStats = () => {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await userService.getQuickStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch user stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface-container-low animate-pulse rounded-2xl border border-outline-variant/10"
          ></div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      title: "Tổng người dùng",
      value: stats.totalUsers,
      icon: UsersIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Mới hôm nay",
      value: stats.newToday,
      icon: UserPlusIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Đang trực tuyến",
      value: stats.onlineNow,
      icon: SignalIcon,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Đã bị khóa",
      value: stats.bannedUsers,
      icon: NoSymbolIcon,
      color: "text-error",
      bgColor: "bg-error/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/15 shadow-sm flex items-center gap-4 transition-all hover:shadow-md"
        >
          <div className={`${item.bgColor} p-3 rounded-xl`}>
            <item.icon className={`w-6 h-6 ${item.color}`} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">
              {item.title}
            </p>
            <h3 className="text-2xl font-headline font-black text-on-surface">
              {item.value.toLocaleString()}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};
