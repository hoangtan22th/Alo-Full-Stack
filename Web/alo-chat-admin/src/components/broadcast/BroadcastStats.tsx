import { ChartBarIcon, UserGroupIcon, SignalIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface BroadcastStatsProps {
  totalCampaigns: number;
  totalReach: number;
  isRealtimeOnline: boolean;
}

export function BroadcastStats({ totalCampaigns, totalReach, isRealtimeOnline }: BroadcastStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 shadow-minimal">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <ChartBarIcon className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tổng chiến dịch</span>
            <h4 className="text-2xl font-black text-on-surface">{totalCampaigns}</h4>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant font-medium">Bản tin đã gửi qua Bot hệ thống</p>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 shadow-minimal">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tổng tiếp cận</span>
            <h4 className="text-2xl font-black text-on-surface">{totalReach.toLocaleString()}</h4>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant font-medium">Số lượt hiển thị đến người dùng</p>
      </div>

      <div className={cn(
        "bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/15 shadow-minimal transition-all",
        !isRealtimeOnline && "border-red-500/30 bg-red-50/5"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl transition-colors",
            isRealtimeOnline ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          )}>
            <SignalIcon className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              isRealtimeOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span className={cn(
              "text-sm font-bold uppercase tracking-widest transition-colors",
              isRealtimeOnline ? "text-green-700" : "text-red-700"
            )}>
              {isRealtimeOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant font-medium">
          {isRealtimeOnline ? "Hạ tầng Socket.IO sẵn sàng" : "Hệ thống đang gặp sự cố"}
        </p>
      </div>
    </div>
  );
}
