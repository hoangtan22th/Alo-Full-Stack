import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

export function StatCard({
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
