"use client";

import { useEffect, useState } from "react";
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  ServerStackIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { GrowthChartCard } from "@/components/dashboard/GrowthChartCard";
import { ActivityDonutCard } from "@/components/dashboard/ActivityDonutCard";
import { ActivityFeedItem } from "@/components/dashboard/ActivityFeedItem";
import { userService, User } from "@/services/userService";
import { groupService, GroupStats } from "@/services/groupService";
import { reportService } from "@/services/reportService";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPage() {
  const [data, setData] = useState<{
    userStats: any;
    groupStats: GroupStats | null;
    reportStats: any;
    recentUsers: User[];
    loading: boolean;
    error: string | null;
  }>({
    userStats: null,
    groupStats: null,
    reportStats: null,
    recentUsers: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchDashboardData = async (isInitial = true) => {
      try {
        if (isInitial) setData((prev) => ({ ...prev, loading: true }));
        
        const [userStats, groupStats, reportStats, recentUsersData] = await Promise.all([
          userService.getQuickStats(),
          groupService.getGroupStats(),
          reportService.getStatistics(),
          userService.getAllUsers({ size: 5 }),
        ]);

        setData({
          userStats,
          groupStats,
          reportStats,
          recentUsers: recentUsersData.content || [],
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load dashboard statistics. Please try again later.",
        }));
      }
    };

    fetchDashboardData();

    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 10000); // Tự động cập nhật mỗi 10 giây

    return () => clearInterval(interval);
  }, []);

  if (data.loading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-12 w-48 bg-surface-container rounded-lg mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-surface-container rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-surface-container rounded-2xl" />
          <div className="h-80 bg-surface-container rounded-2xl" />
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ExclamationCircleIcon className="w-16 h-16 text-error mb-4 opacity-20" />
        <h3 className="text-xl font-bold text-on-surface">Data unavailable</h3>
        <p className="text-on-surface-variant mt-2 max-w-md">{data.error}</p>
        <Button 
          className="mt-6" 
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <>
      <header className="mb-8">
        <h2 className="text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight font-headline">
          Overview
        </h2>
        <p className="text-on-surface-variant font-medium mt-1">
          System performance and network health.
        </p>
      </header>

      {/* Top Row: Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={data.userStats?.totalUsers?.toLocaleString() || "0"}
          trend={`+${data.userStats?.newToday || 0} today`}
          trendPositive={true}
          icon={<UsersIcon className="w-6 h-6 text-primary" />}
        />
        <StatCard
          title="Active Groups"
          value={data.groupStats?.totalGroups?.toLocaleString() || "0"}
          trend={`+${data.groupStats?.createdToday || 0} today`}
          trendPositive={true}
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />}
        />
        <StatCard
          title="Pending Reports"
          value={data.reportStats?.overview?.totalPending?.toLocaleString() || "0"}
          trend={data.reportStats?.overview?.totalPending > 0 ? "Requires attention" : "Clean slate"}
          trendError={data.reportStats?.overview?.totalPending > 0}
          icon={<ExclamationCircleIcon className="w-6 h-6 text-error" />}
        />
        <StatCard
          title="Online Now"
          value={data.userStats?.onlineNow?.toLocaleString() || "0"}
          trend="Currently active"
          icon={<ServerStackIcon className="w-6 h-6 text-tertiary" />}
        />
      </section>

      {/* Middle Row: Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GrowthChartCard totalUsers={data.userStats?.totalUsers || 0} />
        <ActivityDonutCard data={data.reportStats?.byReason || []} />
      </section>

      {/* Bottom Row: Recent Activity Feed */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-minimal overflow-hidden">
        <div className="p-8 border-b border-surface-container-low flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-on-surface">
              Recent User Registrations
            </h3>
            <p className="text-sm font-medium text-on-surface-variant">
              Latest users joined the network.
            </p>
          </div>
          <Button
            variant="ghost"
            asChild
            className="text-sm font-bold text-primary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer px-4"
          >
            <a href="/users">View All Users</a>
          </Button>
        </div>
        <div className="p-0">
          {data.recentUsers.length > 0 ? (
            data.recentUsers.map((user) => (
              <ActivityFeedItem
                key={user.id}
                icon={<UserPlusIcon className="w-5 h-5 text-on-primary-container" />}
                title="New User Joined"
                description={
                  <>
                    <span className="font-bold">{user.fullName}</span> ({user.email}) joined the community.
                  </>
                }
                time={formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                iconBg="bg-primary-container"
              />
            ))
          ) : (
            <div className="p-10 text-center italic text-on-surface-variant">
              No recent activity found.
            </div>
          )}
          <ActivityFeedItem
            icon={<CheckBadgeIcon className="w-5 h-5 text-on-secondary-container" />}
            title="System Status"
            description="All services are currently operational and healthy."
            time="Now"
            iconBg="bg-secondary-container"
          />
        </div>
      </section>
    </>
  );
}

