"use client";
import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon, PhotoIcon, PlayIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { postService } from "../../services/postService";
import { contactService } from "../../services/contactService";
import { useAuthStore } from "../../store/useAuthStore";
import { toast } from "sonner";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
}

// Format file size cho hiển thị
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Định nghĩa các dải màu nền tâm trạng Zalo
const MOOD_TEMPLATES = [
  { id: "sunset", name: "Sunset Glow", class: "bg-gradient-to-r from-orange-400 to-rose-500 text-white" },
  { id: "midnight", name: "Midnight Neon", class: "bg-gradient-to-r from-blue-500 to-purple-600 text-white" },
  { id: "cosmic", name: "Cosmic Purple", class: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white" },
  { id: "emerald", name: "Emerald Forest", class: "bg-gradient-to-r from-emerald-400 to-teal-600 text-white" },
  { id: "rose", name: "Rose Petal", class: "bg-gradient-to-r from-pink-400 to-rose-600 text-white" },
  { id: "sky", name: "Blue Sky", class: "bg-gradient-to-r from-cyan-400 to-blue-600 text-white" },
];

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user: currentUser } = useAuthStore();
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS_ONLY" | "PRIVATE">("FRIENDS_ONLY");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; isVideo: boolean; name: string; size: number }[]>([]);
  const [selectedBg, setSelectedBg] = useState<string | null>(null); // Lưu ID template hình nền được chọn
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States cho Gắn thẻ bạn bè
  const [friends, setFriends] = useState<any[]>([]);
  const [taggedFriendIds, setTaggedFriendIds] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  // Load danh sách bạn bè khi mở modal
  useEffect(() => {
    if (isOpen) {
      contactService.getFriendsList()
        .then((list) => {
          const accepted = list.filter((f) => f.status === "ACCEPTED");
          setFriends(accepted);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Xử lý khi chọn file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (files.length + selectedFiles.length > 10) {
        toast.warning("Bạn chỉ được chọn tối đa 10 ảnh/video.");
        return;
      }

      // Kiểm tra kích thước file
      const oversizedFiles = selectedFiles.filter((f) => f.size > 100 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast.error(`File "${oversizedFiles[0]!.name}" vượt quá 100MB.`);
        return;
      }

      // Hình nền tâm trạng không được đi kèm với ảnh
      setSelectedBg(null);

      setFiles((prev) => [...prev, ...selectedFiles]);

      // Tạo object URL để preview
      const newPreviews = selectedFiles.map((file) => ({
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
        name: file.name,
        size: file.size,
      }));
      setPreviews((prev) => [...prev, ...newPreviews]);

      // Reset input value để cho phép chọn lại cùng file
      e.target.value = "";
    }
  };

  // Xóa file khỏi hàng chờ
  const removeFile = (index: number) => {
    // Thu hồi object URL để tránh rò rỉ bộ nhớ
    URL.revokeObjectURL(previews[index]!.url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Chọn hình nền tâm trạng
  const handleSelectBg = (bgId: string | null) => {
    setSelectedBg(bgId);
    if (bgId) {
      // Khi chọn hình nền tâm trạng thì xóa tất cả ảnh/video đính kèm
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      setFiles([]);
      setPreviews([]);
      // Cắt bớt văn bản nếu vượt quá 150 ký tự
      if (content.length > 150) {
        setContent(content.substring(0, 150));
      }
    }
  };

  // Đăng bài
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const hasVideo = files.some((f) => f.type.startsWith("video/"));
      const post = await postService.createPost(
        content,
        files,
        privacy,
        hasVideo ? (progress) => {
          setUploadProgress(progress);
        } : undefined,
        taggedFriendIds,
        selectedBg || undefined
      );

      if (post) {
        // Cleanup object URLs
        previews.forEach((p) => URL.revokeObjectURL(p.url));
        setContent("");
        setFiles([]);
        setPreviews([]);
        setSelectedBg(null);
        setTaggedFriendIds([]);
        setShowTagSelector(false);
        setUploadProgress(null);
        onClose();
        if (onPostCreated) onPostCreated(post);
        toast.success("Đăng bài viết thành công!");
      } else {
        toast.error("Đăng bài viết thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi đăng bài.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const videoCount = files.filter((f) => f.type.startsWith("video/")).length;
  const imageCount = files.filter((f) => f.type.startsWith("image/")).length;

  const currentTemplate = MOOD_TEMPLATES.find((t) => t.id === selectedBg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tạo bài viết</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Privacy selector */}
          <div className="mb-4">
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-xs rounded-full px-3 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="FRIENDS_ONLY">👥 Bạn bè</option>
              <option value="PRIVATE">🔒 Chỉ mình tôi</option>
            </select>
          </div>

          {/* Text Area (tùy biến giao diện nếu chọn hình nền tâm trạng) */}
          <div className={`relative rounded-2xl overflow-hidden mb-4 transition-all duration-300 ${
            selectedBg ? `h-[200px] flex items-center justify-center p-6 ${currentTemplate?.class}` : 'flex-1 min-h-[120px]'
          }`}>
            <textarea
              placeholder={selectedBg ? "Nhập tâm trạng của bạn..." : "Bạn đang nghĩ gì?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              className={`w-full focus:outline-none resize-none bg-transparent ${
                selectedBg 
                  ? "text-center text-xl font-bold placeholder-white/70 text-white h-full flex items-center justify-center" 
                  : "text-base text-gray-800 dark:text-gray-100 flex-1 min-h-[120px]"
              }`}
              maxLength={selectedBg ? 150 : 2000}
            />

            {/* Bộ đếm ký tự cho hình nền tâm trạng */}
            {selectedBg && (
              <div className="absolute bottom-2 right-3 text-[10px] font-bold text-white/80 bg-black/20 rounded-full px-2 py-0.5">
                {content.length}/150
              </div>
            )}
          </div>

          {/* Media Previews Grid */}
          {previews.length > 0 && (
            <div className="mt-4 pb-4 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="aspect-square relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group">
                    {preview.isVideo ? (
                      <>
                        <video src={preview.url} className="w-full h-full object-cover" preload="metadata" />
                        {/* Video Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <PlayIcon className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                        {/* Video badge */}
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          🎥 Video
                        </div>
                      </>
                    ) : (
                      <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                    )}
                    {/* File size badge */}
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatFileSize(preview.size)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* File summary */}
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium px-1">
                {imageCount > 0 && <span>📷 {imageCount} ảnh</span>}
                {videoCount > 0 && <span>🎥 {videoCount} video</span>}
                <span>•</span>
                <span>Tổng: {formatFileSize(totalSize)}</span>
                <span>•</span>
                <span>{10 - files.length} slot còn trống</span>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {submitting && uploadProgress !== null && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold mb-1">
                <span>Đang tải lên...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Chọn hình nền tâm trạng Zalo */}
          {files.length === 0 && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-gray-500 block mb-2">Chọn hình nền tâm trạng:</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => handleSelectBg(null)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                    selectedBg === null ? "border-blue-500 scale-110 ring-2 ring-blue-200" : "border-gray-200"
                  }`}
                  title="Không dùng hình nền"
                >
                  ✕
                </button>
                {MOOD_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectBg(template.id)}
                    className={`w-8 h-8 rounded-full transition-all border-2 ${template.class} ${
                      selectedBg === template.id ? "border-blue-500 scale-110 ring-2 ring-blue-300" : "border-transparent"
                    }`}
                    title={template.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tagged friends list preview */}
          {taggedFriendIds.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5 items-center bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[11px] text-gray-500 font-semibold mr-1">Cùng với:</span>
              {taggedFriendIds.map((id) => {
                const friend = friends.find(f => {
                  const isReq = f.requesterId === currentUser?.id || f.requesterId === currentUser?._id;
                  const fId = isReq ? f.recipientId : f.requesterId;
                  return String(fId) === String(id);
                });
                const isReq = friend?.requesterId === currentUser?.id || friend?.requesterId === currentUser?._id;
                const name = isReq ? friend?.recipientName : friend?.requesterName;
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100">
                    <span>{name || "Bạn bè"}</span>
                    <button
                      type="button"
                      onClick={() => setTaggedFriendIds(prev => prev.filter(tid => tid !== id))}
                      className="hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Friend Tagging Selector Flyout/Dropdown */}
          {showTagSelector && (
            <div className="mb-4 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 bg-gray-50/50 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-700">Gắn thẻ bạn bè</span>
                <input
                  type="text"
                  placeholder="Tìm tên bạn bè..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="text-xs border border-gray-200 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                {friends
                  .filter(f => {
                    const isReq = f.requesterId === currentUser?.id || f.requesterId === currentUser?._id;
                    const name = isReq ? f.recipientName : f.requesterName;
                    return name?.toLowerCase().includes(tagSearchQuery.toLowerCase());
                  })
                  .map((friend) => {
                    const isReq = friend.requesterId === currentUser?.id || friend.requesterId === currentUser?._id;
                    const fId = isReq ? friend.recipientId : friend.requesterId;
                    const name = isReq ? friend.recipientName : friend.requesterName;
                    const avatar = isReq ? friend.recipientAvatar : friend.requesterAvatar;
                    const isChecked = taggedFriendIds.includes(String(fId));

                    const handleCheckboxChange = () => {
                      if (isChecked) {
                        setTaggedFriendIds(prev => prev.filter(id => id !== String(fId)));
                      } else {
                        setTaggedFriendIds(prev => [...prev, String(fId)]);
                      }
                    };

                    const getAvatar = (url?: string, fullName?: string) => {
                      if (url) {
                        if (url.startsWith("http") || url.startsWith("data:")) return url;
                        return `http://localhost:8888${url.startsWith("/") ? "" : "/"}${url}`;
                      }
                      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
                    };

                    return (
                      <div
                        key={friend.id}
                        onClick={handleCheckboxChange}
                        className="flex items-center justify-between hover:bg-white p-1.5 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-100">
                            <img
                              src={getAvatar(avatar, name)}
                              alt={name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).onerror = null;
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=E5E7EB&color=374151&rounded=true`;
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-800">{name}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={handleCheckboxChange}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                {friends.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-400">
                    Chưa có bạn bè để gắn thẻ.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between mt-auto">
            <span className="text-sm font-semibold text-gray-600">Thêm vào bài viết</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTagSelector(!showTagSelector)}
                disabled={submitting}
                className={`p-2 rounded-full transition-colors ${showTagSelector ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-500'}`}
                title="Gắn thẻ bạn bè"
              >
                <UserPlusIcon className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="p-2 hover:bg-gray-50 rounded-full text-blue-600 transition-colors"
                title="Thêm ảnh/video"
              >
                <PhotoIcon className="w-6 h-6" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={submitting || (!content.trim() && files.length === 0)}
            className="w-full mt-5 py-3 rounded-full bg-blue-600 disabled:bg-blue-300 hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {uploadProgress !== null ? `Đang tải lên ${Math.round(uploadProgress)}%...` : "Đang đăng bài..."}
              </>
            ) : (
              "Đăng bài"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
