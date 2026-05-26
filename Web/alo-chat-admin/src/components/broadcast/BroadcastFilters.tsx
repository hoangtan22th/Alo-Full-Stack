import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface BroadcastFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeBot: string;
  onBotChange: (value: string) => void;
  activeStatus: string;
  onStatusChange: (value: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
}

export function BroadcastFilters({
  searchTerm,
  onSearchChange,
  activeBot,
  onBotChange,
  activeStatus,
  onStatusChange,
  onRefresh,
  isLoading,
  totalCount
}: BroadcastFiltersProps) {
  return (
    <div className="bg-surface-container-low rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center border border-outline-variant/15">
      <div className="text-xs font-bold text-on-surface mr-2 tracking-wide uppercase">Filters</div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[350px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-on-surface-variant" />
        </div>
        <input
          type="text"
          placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Bot Type Filter */}
      <div className="flex bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-1">
        {["ALL", "SYSTEM", "SECURITY", "EVENT"].map((bot) => (
          <button
            key={bot}
            onClick={() => onBotChange(bot)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeBot === bot
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
              }`}
          >
            {bot === "ALL" ? "TẤT CẢ" : bot}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-1">
        {["ALL", "PROCESSING", "COMPLETED", "FAILED"].map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeStatus === status
              ? "bg-on-surface text-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
              }`}
          >
            {status === "ALL" ? "TẤT CẢ TRẠNG THÁI" :
              status === "PROCESSING" ? "ĐANG GỬI" :
                status === "COMPLETED" ? "HOÀN TẤT" : "LỖI"}
          </button>
        ))}
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        className="p-2 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-on-surface-variant hover:text-primary hover:border-primary transition-all shadow-sm"
        title="Làm mới & Xóa bộ lọc"
      >
        <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
      </button>

      <div className="ml-auto text-sm text-on-surface-variant font-medium">
        Hiển thị <span className="text-on-surface font-bold">{totalCount}</span> chiến dịch
      </div>
    </div>
  );
}
