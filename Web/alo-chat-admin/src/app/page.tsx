import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  ServerStackIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";

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

// Internal Components mapped to the Design System structure

function StatCard({
  title,
  value,
  trend,
  icon,
  trendPositive,
  trendError,
}: any) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 flex flex-col justify-between shadow-minimal">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
          {title}
        </p>
        {icon}
      </div>
      <div>
        <h3 className="text-4xl font-extrabold text-on-surface">{value}</h3>
        <p
          className={`text-sm font-medium mt-2 flex items-center gap-1 ${
            trendError ? "text-error" : "text-[#4b525f]"
          }`}
        >
          {trendPositive && <ArrowTrendingUpIcon className="w-4 h-4" />}
          {!trendPositive && !trendError && title === "System Status" && (
            <CheckCircleIcon className="w-4 h-4" />
          )}
          {trendError && <ExclamationCircleIcon className="w-4 h-4" />}
          {trend}
        </p>
      </div>
    </div>
  );
}

function GrowthChartCard() {
  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-surface">
            User Growth & Activity
          </h3>
          <p className="text-sm font-medium text-on-surface-variant">
            Daily active users over the last 30 days.
          </p>
        </div>
        <button className="p-2 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant cursor-pointer">
          <EllipsisVerticalIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 min-h-[250px] flex items-end justify-between gap-2 pt-8 border-b border-surface-container-high relative">
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs font-medium text-outline-variant pb-8">
          <span>1.5M</span>
          <span>1.0M</span>
          <span>500K</span>
          <span>0</span>
        </div>
        <div className="ml-10 w-full flex items-end justify-between gap-1 h-full pb-1">
          {[30, 40, 35, 45, 60, 55, 70, 80, 75, 90].map((h, i) => (
            <div
              key={i}
              className="w-full bg-surface-container-high rounded-t-sm hover:bg-surface-variant transition-colors"
              style={{ height: `${h}%` }}
            ></div>
          ))}
          <div className="w-full bg-primary h-[100%] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity relative group">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-on-surface text-surface-container-lowest text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              1.24M Today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityDonutCard() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-on-surface">Group Activity</h3>
        <p className="text-sm font-medium text-on-surface-variant">
          Distribution by category.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        {/* Placeholder styling to replicate the HTML CSS trickery natively */}
        <div className="w-48 h-48 rounded-full border-[16px] border-surface-container-high relative">
          <div
            className="absolute inset-[-16px] rounded-full border-[16px] border-primary opacity-80"
            style={{ clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)" }}
          ></div>
          <div
            className="absolute inset-[-16px] rounded-full border-[16px] border-secondary opacity-60"
            style={{ clipPath: "polygon(0 0, 50% 0, 50% 50%, 0 50%)" }}
          ></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-on-surface">
              45.2K
            </span>
            <span className="text-xs font-medium text-on-surface-variant">
              Total
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <LegendItem
          color="bg-primary opacity-80"
          label="Public Forums"
          value="65%"
        />
        <LegendItem
          color="bg-secondary opacity-60"
          label="Private Groups"
          value="25%"
        />
        <LegendItem
          color="bg-surface-container-high"
          label="Broadcast Channels"
          value="10%"
        />
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
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${color}`}></span>
        <span className="font-medium text-on-surface">{label}</span>
      </div>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}

function ActivityFeedItem({ icon, title, description, time, iconBg }: any) {
  return (
    <div className="flex items-start gap-4 p-6 hover:bg-surface-container-low transition-colors duration-200">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-base font-bold text-on-surface">{title}</h4>
        <p className="text-sm font-medium text-on-surface-variant mt-1">
          {description}
        </p>
      </div>
      <div className="text-sm font-medium text-outline-variant">{time}</div>
    </div>
  );
}
