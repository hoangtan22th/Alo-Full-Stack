import { 
  MagnifyingGlassIcon, 
  IdentificationIcon, 
  UserGroupIcon, 
  UserPlusIcon, 
  EnvelopeIcon 
} from '@heroicons/react/24/outline';

export default function ContactSidebar() {
  return (
    <div className="w-80 h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      {/* Header & Search */}
      <div className="p-6 pb-4">
        <h2 className="text-[22px] font-bold mb-5">Danh bạ</h2>
        <div className="bg-gray-100/80 rounded-full px-4 py-2.5 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            className="bg-transparent w-full outline-none text-[15px] placeholder-gray-400"
          />
        </div>
      </div>

      {/* List Menu */}
      <div className="flex-1 px-4 space-y-1">
        <div className="p-3 hover:bg-gray-50 text-gray-600 rounded-2xl cursor-pointer font-medium text-[15px] flex items-center gap-3 transition-colors">
           <IdentificationIcon className="w-6 h-6" />
           Danh sách bạn bè
        </div>
        <div className="p-3 hover:bg-gray-50 text-gray-600 rounded-2xl cursor-pointer font-medium text-[15px] flex items-center gap-3 transition-colors">
           <UserGroupIcon className="w-6 h-6" />
           Danh sách nhóm
        </div>
        
        {/* Tab Đang Active */}
        <div className="p-3 bg-gray-50 text-black rounded-2xl cursor-pointer font-semibold text-[15px] flex items-center justify-between">
           <div className="flex items-center gap-3">
              <UserPlusIcon className="w-6 h-6" />
              Lời mời kết bạn
           </div>
           <span className="bg-black text-white text-[11px] px-2 py-0.5 rounded-full font-bold">12</span>
        </div>

        <div className="p-3 hover:bg-gray-50 text-gray-600 rounded-2xl cursor-pointer font-medium text-[15px] flex items-center gap-3 transition-colors">
           <EnvelopeIcon className="w-6 h-6" />
           Lời mời vào nhóm
        </div>
      </div>
    </div>
  );
}