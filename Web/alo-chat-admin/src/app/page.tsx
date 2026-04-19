import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  ServerStackIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { GrowthChartCard } from "@/components/dashboard/GrowthChartCard";
import { ActivityDonutCard } from "@/components/dashboard/ActivityDonutCard";
import { ActivityFeedItem } from "@/components/dashboard/ActivityFeedItem";

export default function OverviewPage() {
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
          value="1.24M"
          trend="+5.2% this month"
          trendPositive={true}
          icon={<UsersIcon className="w-6 h-6 text-primary" />}
        />
        <StatCard
          title="Active Groups"
          value="45.2K"
          trend="+1.1% this week"
          trendPositive={true}
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6 text-primary" />}
        />
        <StatCard
          title="Pending Reports"
          value="1,842"
          trend="Requires attention"
          trendError={true}
          icon={<ExclamationCircleIcon className="w-6 h-6 text-error" />}
        />
        <StatCard
          title="System Status"
          value="99.9%"
          trend="All systems operational"
          icon={<ServerStackIcon className="w-6 h-6 text-[#4b525f]" />}
        />
      </section>

      {/* Middle Row: Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GrowthChartCard />
        <ActivityDonutCard />
      </section>

      {/* Bottom Row: Recent Activity Feed */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-minimal overflow-hidden">
        <div className="p-8 border-b border-surface-container-low flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-on-surface">
              Recent Activity Feed
            </h3>
            <p className="text-sm font-medium text-on-surface-variant">
              Latest system events and moderation actions.
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-sm font-bold text-primary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer px-4"
          >
            View All Logs
          </Button>
        </div>
        <div className="p-0">
          <ActivityFeedItem
            icon={<NoSymbolIcon className="w-5 h-5 text-on-error-container" />}
            title="User Banned"
            description={
              <>
                User ID{" "}
                <span className="font-mono text-xs bg-surface-container px-1 py-0.5 rounded">
                  #8934A
                </span>{" "}
                was permanently banned for violating community guidelines.
              </>
            }
            time="2 mins ago"
            iconBg="bg-error-container"
          />
          <ActivityFeedItem
            icon={
              <ShieldCheckIcon className="w-5 h-5 text-on-tertiary-container" />
            }
            title="Moderator Action"
            description={
              <>
                Group "Tech Enthusiasts" flagged for review by Mod{" "}
                <span className="font-bold">@sarah_w</span>.
              </>
            }
            time="15 mins ago"
            iconBg="bg-tertiary-container"
          />
          <ActivityFeedItem
            icon={<ClockIcon className="w-5 h-5 text-on-surface" />}
            title="System Update"
            description="Routine database maintenance completed successfully. Downtime: 0ms."
            time="1 hour ago"
            iconBg="bg-surface-container-high"
          />
        </div>
      </section>
    </>
  );
}
