"use client";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PlusIcon,
  CalendarDaysIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { reminderService, ReminderDTO } from "@/services/reminderService";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

interface ReminderModalProps {
  conversationId: string;
  onClose: () => void;
}

export default function ReminderModal({ conversationId, onClose }: ReminderModalProps) {
  const [reminders, setReminders] = useState<ReminderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  const { userId: currentUserId } = useAuthStore();

  // Create Reminder State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("NONE");
  const [remindFor, setRemindFor] = useState("GROUP");

  useEffect(() => {
    fetchReminders();
  }, [conversationId]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const data = await reminderService.getRemindersByConversation(conversationId);
      
      // Kiểm tra data hợp lệ trước khi sắp xếp
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setReminders(sortedData);
      } else {
        setReminders([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách nhắc hẹn");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!title.trim() || !date || !time) return toast.error("Vui lòng nhập đầy đủ thông tin");

    try {
      const combinedDateTime = new Date(`${date}T${time}`).toISOString();
      const payload = {
        title,
        time: combinedDateTime,
        repeat,
        remindFor,
      };
      const created = await reminderService.createReminder(conversationId, payload);
      if (created) {
        toast.success("Đã tạo nhắc hẹn mới");
        handleReset();
        fetchReminders();
      }
    } catch (err) {
      toast.error("Lỗi khi tạo nhắc hẹn");
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhắc hẹn này?")) return;
    try {
      const success = await reminderService.deleteReminder(id);
      if (success) {
        toast.success("Đã xóa nhắc hẹn");
        fetchReminders();
      }
    } catch (err) {
      toast.error("Lỗi khi xóa nhắc hẹn");
    }
  };

  const handleReset = () => {
    setShowCreate(false);
    setTitle("");
    setDate("");
    setTime("");
    setRepeat("NONE");
    setRemindFor("GROUP");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Nhắc hẹn</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Không bỏ lỡ các sự kiện quan trọng</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {showCreate ? (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Nội dung nhắc hẹn</label>
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Họp nhóm, Sinh nhật..."
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Ngày</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Giờ</label>
                  <input 
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Lặp lại</label>
                <select 
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition appearance-none"
                >
                  <option value="NONE">Không lặp lại</option>
                  <option value="DAILY">Hàng ngày</option>
                  <option value="WEEKLY">Hàng tuần</option>
                  <option value="MONTHLY">Hàng tháng</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Nhắc cho ai</label>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setRemindFor("GROUP")}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition ${remindFor === 'GROUP' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    CẢ NHÓM
                  </button>
                  <button 
                    onClick={() => setRemindFor("CREATOR")}
                    className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition ${remindFor === 'CREATOR' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    CHỈ MÌNH TÔI
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl font-bold text-[13px] text-gray-500 hover:bg-gray-100 transition"
                >
                  HỦY
                </button>
                <button 
                  onClick={handleCreateReminder}
                  className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-blue-600 text-white shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition"
                >
                  TẠO NHẮC HẸN
                </button>
              </div>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setShowCreate(true)}
                className="w-full mb-6 py-4 flex items-center justify-center gap-3 bg-blue-50 text-blue-600 rounded-2xl border-2 border-dashed border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition group"
              >
                <PlusIcon className="w-5 h-5 group-hover:scale-110 transition" />
                <span className="text-[14px] font-black uppercase tracking-tight">Tạo nhắc hẹn mới</span>
              </button>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3" />
                  </div>
                ) : reminders.length > 0 ? (
                  reminders.map((rem) => (
                    <div key={rem._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition group relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-[14px] font-bold text-gray-900 pr-8">{rem.title}</h3>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                               <ClockIcon className="w-3.5 h-3.5" />
                               {new Date(rem.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                             </div>
                             {rem.repeat !== 'NONE' && (
                               <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Lặp: {rem.repeat}</span>
                             )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteReminder(rem._id)}
                          className="absolute top-4 right-4 p-1.5 bg-white shadow-sm rounded-lg text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-2">
                        Nhắc cho: {rem.remindFor === 'GROUP' ? 'Cả nhóm' : 'Chỉ mình tôi'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center py-10 opacity-40">
                    <CalendarDaysIcon className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold italic">Chưa có nhắc hẹn nào</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
