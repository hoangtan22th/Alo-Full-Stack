import { format } from "date-fns";
import { 
  MegaphoneIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  ArrowPathIcon, 
  ChevronRightIcon 
} from "@heroicons/react/24/outline";
import { BroadcastCampaign } from "@/services/broadcastService";
import { cn } from "@/lib/utils";

interface BroadcastTableProps {
  campaigns: BroadcastCampaign[];
  isLoading: boolean;
  onViewDetail: (campaign: BroadcastCampaign) => void;
  onResetFilters?: () => void;
}

export function BroadcastTable({ campaigns, isLoading, onViewDetail, onResetFilters }: BroadcastTableProps) {
  const getBotInfo = (senderId: string) => {
    if (senderId === "00000000-0000-0000-0000-000000000000") return { name: "Hệ thống", color: "bg-primary/10 text-primary", icon: MegaphoneIcon };
    if (senderId === "11111111-1111-1111-1111-111111111111") return { name: "An ninh", color: "bg-blue-100 text-blue-700", icon: ShieldCheckIcon };
    if (senderId === "22222222-2222-2222-2222-222222222222") return { name: "Sự kiện", color: "bg-purple-100 text-purple-700", icon: SparklesIcon };
    return { name: "Bot", color: "bg-gray-100 text-gray-700", icon: MegaphoneIcon };
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-minimal overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-surface-container-low/50 border-b border-outline-variant/15">
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Thời gian</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Người gửi</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nội dung chiến dịch</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Tiếp cận</th>
              <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">Trạng thái</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {isLoading && campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-primary/40" />
                    <p className="text-sm font-medium text-on-surface-variant">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-on-surface-variant">
                    <div className="p-4 bg-surface-container-high rounded-full">
                      <MegaphoneIcon className="w-12 h-12 opacity-20" />
                    </div>
                    <p className="font-medium italic">Không tìm thấy bản tin nào khớp với yêu cầu.</p>
                    {onResetFilters && (
                      <button onClick={onResetFilters} className="text-primary font-bold text-sm hover:underline">Xóa tất cả bộ lọc</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const bot = getBotInfo(campaign.senderId);
                return (
                  <tr 
                    key={campaign._id} 
                    onClick={() => onViewDetail(campaign)}
                    className="group hover:bg-surface-container-low/30 cursor-pointer transition-all"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">
                          {format(new Date(campaign.createdAt), "dd/MM/yyyy")}
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {format(new Date(campaign.createdAt), "HH:mm")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", bot.color)}>
                        <bot.icon className="w-3.5 h-3.5" />
                        {bot.name}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5 max-w-md">
                        <span className="text-sm font-bold text-on-surface line-clamp-1">{campaign.title}</span>
                        <span className="text-[11px] text-on-surface-variant line-clamp-1 font-medium opacity-70">
                          {campaign.content}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg text-xs font-bold text-on-surface border border-outline-variant/10 shadow-sm">
                        <UserGroupIcon className="w-4 h-4 text-on-surface-variant" />
                        {campaign.targetCount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {campaign.status === 'PROCESSING' ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-[10px] font-black uppercase">
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                          Đang gửi
                        </div>
                      ) : campaign.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Hoàn tất
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Lỗi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="p-2 hover:bg-surface-container-high rounded-full transition-all group-hover:bg-primary/10">
                        <ChevronRightIcon className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
