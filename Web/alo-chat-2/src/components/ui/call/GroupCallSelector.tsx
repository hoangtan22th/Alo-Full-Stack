"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

interface Member {
  userId: string;
  fullName?: string;
  displayName?: string;
  avatar?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  members: Member[];
  myId: string;
  userCache: Record<string, { name: string; avatar: string }>;
  isVideo: boolean;
}

export default function GroupCallSelector({ 
  isOpen, onClose, onConfirm, members, myId, userCache, isVideo 
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 pb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-black tracking-tight">Chọn người tham gia</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                Cuộc gọi {isVideo ? 'Video' : 'Thoại'} nhóm
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 max-h-[50vh] custom-scrollbar">
          <div className="space-y-1">
            {members?.filter(m => String(m.userId) !== String(myId)).map((member) => {
              const info = userCache[member.userId] || { 
                name: member.fullName || member.displayName || "Người dùng", 
                avatar: member.avatar 
              };
              const isSelected = selectedIds.includes(member.userId);
              
              return (
                <div 
                  key={member.userId} 
                  onClick={() => toggleMember(member.userId)}
                  className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                    isSelected ? 'bg-black text-white shadow-lg shadow-black/10' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border overflow-hidden ${
                      isSelected ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-100'
                    }`}>
                      {info.avatar ? (
                        <img src={info.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        info.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-bold text-[14px]">{info.name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-white border-white' : 'border-gray-200'
                  }`}>
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
            {(!members || members.length <= 1) && (
              <div className="text-center py-12 opacity-30">
                <p className="text-sm">Không tìm thấy thành viên khác</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 pt-4 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-bold text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg ${
              selectedIds.length > 0 
                ? 'bg-black text-white hover:bg-gray-800 shadow-black/10' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            Bắt đầu ({selectedIds.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
}
