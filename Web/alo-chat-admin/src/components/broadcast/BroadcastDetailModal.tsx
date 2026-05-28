import { format } from "date-fns";
import { 
  MegaphoneIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  XMarkIcon, 
  EyeIcon, 
  ClockIcon, 
  UserGroupIcon 
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { BroadcastCampaign } from "@/services/broadcastService";
import { cn } from "@/lib/utils";

interface BroadcastDetailModalProps {
  campaign: BroadcastCampaign | null;
  onClose: () => void;
}

export function BroadcastDetailModal({ campaign, onClose }: BroadcastDetailModalProps) {
  if (!campaign) return null;

  const getBotInfo = (senderId: string) => {
    if (senderId === "00000000-0000-0000-0000-000000000000") return { name: "Hệ thống", color: "bg-primary/10 text-primary", icon: MegaphoneIcon };
    if (senderId === "11111111-1111-1111-1111-111111111111") return { name: "An ninh", color: "bg-blue-100 text-blue-700", icon: ShieldCheckIcon };
    if (senderId === "22222222-2222-2222-2222-222222222222") return { name: "Sự kiện", color: "bg-purple-100 text-purple-700", icon: SparklesIcon };
    return { name: "Bot", color: "bg-gray-100 text-gray-700", icon: MegaphoneIcon };
  };

  const bot = getBotInfo(campaign.senderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full max-w-3xl rounded-3xl shadow-2xl border border-outline-variant/15 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-outline-variant/15 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className={cn("p-2 rounded-xl", bot.color)}>
                <EyeIcon className="w-6 h-6" />
             </div>
             <h3 className="text-xl font-black text-on-surface">Chi tiết bản tin</h3>
           </div>
           <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
        </div>
        
        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface p-4 rounded-2xl border border-outline-variant/10">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-2">Người gửi</span>
              <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider", bot.color)}>
                {bot.name}
              </div>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-outline-variant/10">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-2">Thời gian</span>
              <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                <ClockIcon className="w-4 h-4 text-on-surface-variant" />
                {format(new Date(campaign.createdAt), "dd/MM/yyyy HH:mm:ss")}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Tiêu đề</span>
              <h4 className="text-2xl font-black text-on-surface leading-tight">
                {campaign.title}
              </h4>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Nội dung đầy đủ</span>
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 text-on-surface leading-relaxed whitespace-pre-wrap font-medium text-sm">
                {campaign.content}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <UserGroupIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Tổng tiếp cận</span>
                <span className="text-lg font-black text-on-surface">{campaign.targetCount.toLocaleString()} người dùng</span>
              </div>
            </div>
            <div className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black border shadow-sm uppercase tracking-wider",
              campaign.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
            )}>
              {campaign.status === 'COMPLETED' ? "Hoàn tất" : "Đang xử lý"}
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-container-low border-t border-outline-variant/15 text-right">
          <Button 
            onClick={onClose}
            className="px-10 py-6 bg-on-surface text-surface font-black rounded-xl hover:opacity-90"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
