import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  MegaphoneIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  PaperAirplaneIcon 
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { broadcastService } from "@/services/broadcastService";
import { useConfirmStore } from "@/store/useConfirmStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const broadcastSchema = z.object({
  title: z.string()
    .min(1, "Tiêu đề không được để trống")
    .max(100, "Tiêu đề không được quá 100 ký tự"),
  content: z.string()
    .min(1, "Nội dung không được để trống")
    .min(10, "Nội dung quá ngắn (tối thiểu 10 ký tự)"),
  botType: z.enum(["SYSTEM", "SECURITY", "EVENT"]),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

interface CreateBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateBroadcastModal({ isOpen, onClose, onSuccess }: CreateBroadcastModalProps) {
  const { confirm } = useConfirmStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      botType: "SYSTEM",
      title: "",
      content: "",
    },
  });

  const selectedBot = watch("botType");

  const onSubmit = async (data: BroadcastFormValues) => {
    confirm({
      title: "Xác nhận phát sóng",
      message: "Hành động này sẽ gửi thông báo tức thì đến toàn bộ người dùng ngay lập tức. Bạn chắc chắn muốn tiếp tục?",
      confirmText: "Xác nhận gửi",
      cancelText: "Hủy",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await broadcastService.createBroadcast(data);
          toast.success("Đã bắt đầu chiến dịch phát sóng!");
          reset();
          onSuccess();
          onClose();
        } catch (error) {
          toast.error("Gửi thất bại. Vui lòng thử lại.");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full max-w-3xl rounded-3xl shadow-2xl border border-outline-variant/15 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/15 bg-surface-container-low">
          <h3 className="text-2xl font-black text-on-surface flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-on-primary">
              <MegaphoneIcon className="w-6 h-6" />
            </div>
            Tạo chiến dịch phát sóng
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest block">
              Danh tính người gửi
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'SYSTEM', name: 'System Bot', desc: 'Thông báo chung', icon: MegaphoneIcon, color: 'primary' },
                { id: 'SECURITY', name: 'Security', desc: 'An ninh & Cảnh báo', icon: ShieldCheckIcon, color: 'blue-600' },
                { id: 'EVENT', name: 'Sự kiện', desc: 'Tin tức & Hot deals', icon: SparklesIcon, color: 'purple-600' }
              ].map((bot) => (
                <label key={bot.id} className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedBot === bot.id 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-outline-variant/15 hover:border-outline-variant/40 bg-surface"
                )}>
                  <input type="radio" value={bot.id} {...register("botType")} className="sr-only" />
                  <div className={cn(
                    "p-2 rounded-xl", 
                    selectedBot === bot.id ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"
                  )}>
                    <bot.icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-on-surface">{bot.name}</span>
                    <span className="text-[10px] text-on-surface-variant font-medium leading-tight">{bot.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest block">Tiêu đề bản tin</label>
            <input
              {...register("title")}
              className={cn(
                "w-full px-5 py-4 bg-surface border rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-lg font-bold",
                errors.title ? "border-red-500" : "border-outline-variant/20 focus:border-primary"
              )}
              placeholder="Nhập tiêu đề thu hút người dùng..."
            />
            {errors.title && <p className="text-red-500 text-xs font-bold px-2 mt-1">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest block">Nội dung chi tiết</label>
            <textarea
              {...register("content")}
              rows={10}
              className={cn(
                "w-full px-5 py-4 bg-surface border rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-base font-medium resize-none leading-relaxed",
                errors.content ? "border-red-500" : "border-outline-variant/20 focus:border-primary"
              )}
              placeholder="Viết nội dung thông báo tại đây. Hỗ trợ hiển thị nhiều dòng..."
            />
            {errors.content && <p className="text-red-500 text-xs font-bold px-2 mt-1">{errors.content.message}</p>}
          </div>
        </form>

        <div className="p-6 bg-surface-container-low border-t border-outline-variant/15 flex items-center justify-between">
          <div className="flex items-center gap-3 text-orange-700 bg-orange-50 px-4 py-2 rounded-xl text-xs font-bold border border-orange-200 max-w-sm">
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
            Dữ liệu sẽ được gửi tới toàn bộ người dùng ngay lập tức.
          </div>
          <div className="flex gap-4">
            <Button 
              variant="ghost"
              onClick={onClose}
              className="font-bold text-on-surface-variant"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="px-10 py-6 bg-primary text-on-primary font-black rounded-xl hover:bg-primary-dim shadow-xl shadow-primary/30 transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <ArrowPathIcon className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <PaperAirplaneIcon className="w-6 h-6 mr-2" />
                  Phát hành
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
