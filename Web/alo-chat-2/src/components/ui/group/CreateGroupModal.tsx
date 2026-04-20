"use client";
import { useAuthStore } from "@/store/useAuthStore";

import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  CameraIcon,
  PhotoIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import * as groupApi from "@/api/group.api"; // Import từ file trên
import axiosClient from "@/services/api";
import { toast } from "sonner";

export default function CreateGroupModal({ onClose, onSuccess }: any) {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load danh sách bạn bè để chọn (Vì BE chỉ cho mời bạn bè)
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res: any = await axiosClient.get("/contacts/friends");
        setFriends(Array.isArray(res) ? res : res.data || []);
      } catch (err) {
        toast.error("Không thể tải danh sách bạn bè");
      }
    };
    loadFriends();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return toast.error("Nhập tên nhóm đi Tấn ơi!");
    if (selectedUserIds.length < 2)
      return toast.error("Cần thêm ít nhất 2 bạn bè nữa mới đủ 3 người!");

    try {
      setLoading(true);
      const userId = useAuthStore.getState().userId || "";
      await groupApi.createGroup({
        name: groupName,
        userIds: selectedUserIds,
        avatarFile: avatar || undefined,
        userId,
      });
      toast.success("Tạo nhóm thành công!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Lỗi tạo nhóm rồi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-black">Tạo nhóm mới</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Ảnh & Tên */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center cursor-pointer border-2 border-dashed relative overflow-hidden"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <CameraIcon className="w-6 h-6 text-gray-400" />
              )}
              <input
                type="file"
                hidden
                ref={fileRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setAvatar(f);
                    setPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </div>
            <input
              className="flex-1 bg-gray-50 border-none rounded-2xl p-4 font-bold"
              placeholder="Tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Danh sách chọn bạn bè */}
          <div className="space-y-3">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              Chọn thành viên ({selectedUserIds.length})
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {friends.map((f) => (
                <div
                  key={f.id}
                  onClick={() => toggleSelect(f.displayId)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${selectedUserIds.includes(f.displayId) ? "bg-black text-white" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={f.displayAvatar || "/avt-mac-dinh.jpg"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="font-bold text-sm">{f.displayName}</span>
                  </div>
                  {selectedUserIds.includes(f.displayId) && (
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50">
          <button
            disabled={loading}
            onClick={handleCreate}
            className="w-full bg-black text-white py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition disabled:bg-gray-400"
          >
            {loading ? "ĐANG XỬ LÝ..." : "TẠO NHÓM NGAY"}
          </button>
        </div>
      </div>
    </div>
  );
}
