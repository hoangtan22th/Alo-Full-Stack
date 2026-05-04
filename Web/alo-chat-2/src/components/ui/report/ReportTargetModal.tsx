"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserIcon, UserGroupIcon, ChevronRightIcon, ArrowLeftIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  userId: string;
  fullName: string;
  avatar?: string;
}

interface ReportTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  members: Member[];
  onSelectTarget: (targetType: "USER" | "GROUP", targetId: string, targetName: string) => void;
}

export default function ReportTargetModal({
  isOpen,
  onClose,
  groupName,
  members,
  onSelectTarget,
}: ReportTargetModalProps) {
  const [step, setStep] = React.useState<"choice" | "members">("choice");

  const handleClose = () => {
    setStep("choice");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-red-50/30 pointer-events-none" />
        
        <DialogHeader className="p-8 pb-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
            <ShieldExclamationIcon className="w-7 h-7" />
          </div>
          <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Phân loại báo cáo
          </DialogTitle>
          <DialogDescription className="text-gray-500 font-medium text-[15px]">
            {step === "choice" 
              ? "Vui lòng chọn đối tượng vi phạm để chúng tôi xử lý chính xác nhất." 
              : "Chọn thành viên trong nhóm mà bạn muốn báo cáo vi phạm."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-8 relative z-10">
          <AnimatePresence mode="wait">
            {step === "choice" ? (
              <motion.div 
                key="choice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <button
                  onClick={() => setStep("members")}
                  className="w-full flex items-center justify-between p-5 rounded-3xl bg-white border border-gray-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <UserIcon className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-gray-900 text-lg">Thành viên</p>
                      <p className="text-[13px] text-gray-500 font-medium">Báo cáo cá nhân cụ thể</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <ChevronRightIcon className="w-5 h-5" />
                  </div>
                </button>

                <button
                  onClick={() => onSelectTarget("GROUP", "", groupName)}
                  className="w-full flex items-center justify-between p-5 rounded-3xl bg-white border border-gray-100 hover:border-red-500 hover:shadow-xl hover:shadow-red-500/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                      <UserGroupIcon className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-gray-900 text-lg">Toàn bộ nhóm</p>
                      <p className="text-[13px] text-gray-500 font-medium">Báo cáo nội dung chung của nhóm</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                    <ChevronRightIcon className="w-5 h-5" />
                  </div>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="members"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <button 
                  onClick={() => setStep("choice")}
                  className="flex items-center gap-2 text-sm font-black text-blue-600 hover:text-blue-700 transition-colors px-2"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  QUAY LẠI
                </button>
                
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {members.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => onSelectTarget("USER", member.userId, member.fullName)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">{member.fullName}</p>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Thành viên nhóm</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
