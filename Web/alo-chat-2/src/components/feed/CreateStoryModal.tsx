"use client";
import React, { useState, useRef } from "react";
import { XMarkIcon, PhotoIcon, PlayIcon } from "@heroicons/react/24/outline";
import { postService } from "@/services/postService";
import { toast } from "sonner";
import { socketService } from "@/services/socketService";
import { contactService } from "@/services/contactService";
import { useAuthStore } from "@/store/useAuthStore";
import MusicSelector, { SpotifyTrack } from "./MusicSelector";

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated?: (story: any) => void;
}

export default function CreateStoryModal({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) {
  const { user: currentUser } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"FRIENDS_ONLY" | "PRIVATE">("FRIENDS_ONLY");
  const [selectedMusic, setSelectedMusic] = useState<SpotifyTrack | null>(null);
  const [duration, setDuration] = useState<number>(5000); // Mặc định 5s (5000ms)
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("File vượt quá 50MB.");
        return;
      }

      // Revoke old preview
      if (preview) URL.revokeObjectURL(preview.url);

      const isVideo = selectedFile.type.startsWith("video/");
      setFile(selectedFile);
      const fileUrl = URL.createObjectURL(selectedFile);
      setPreview({
        url: fileUrl,
        isVideo,
      });

      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = fileUrl;
        video.onloadedmetadata = () => {
          setVideoDuration(video.duration);
          // Set default duration for video: either 15s or full video length if < 15s
          setDuration(Math.min(video.duration * 1000, 15000));
        };
      } else {
        setVideoDuration(null);
        setDuration(5000); // default 5s for image
      }

      e.target.value = "";
    }
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setFile(null);
    setPreview(null);
    setVideoDuration(null);
    setDuration(5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.warning("Vui lòng chọn ảnh hoặc video cho Story.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const story = await postService.createStory(
        file,
        caption || undefined,
        privacy,
        (progress) => setUploadProgress(progress),
        selectedMusic
          ? {
              title: selectedMusic.name,
              artist: selectedMusic.artists.map((a) => a.name).join(", "),
              url: selectedMusic.preview_url || "",
            }
          : undefined,
        duration
      );

      if (story) {
        if (preview) URL.revokeObjectURL(preview.url);
        setFile(null);
        setPreview(null);
        setCaption("");
        setSelectedMusic(null);
        setVideoDuration(null);
        setDuration(5000);
        setUploadProgress(null);
        onClose();

        if (onStoryCreated) onStoryCreated(story);
        toast.success("Đăng Story thành công!");
      } else {
        toast.error("Đăng Story thất bại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi đăng Story.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800/80">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-zinc-50">Tạo Story mới</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col custom-scrollbar">
          {/* Privacy & Custom select container */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Ai có thể xem?</span>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 text-xs rounded-full px-3 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="FRIENDS_ONLY">👥 Bạn bè</option>
              <option value="PRIVATE">🔒 Chỉ mình tôi</option>
            </select>
          </div>

          {/* Caption */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Thêm chú thích cho Story của bạn..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              disabled={submitting}
              className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/60 focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 rounded-full px-4.5 py-2.5 focus:outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Spotify Music Selector */}
          <MusicSelector
            onSelectTrack={setSelectedMusic}
            selectedTrack={selectedMusic}
          />
          <div className="mb-4" />

          {/* Media preview or upload zone */}
          {preview ? (
            <div className="relative h-[360px] w-full bg-zinc-950 rounded-2xl overflow-hidden mx-auto flex items-center justify-center border border-zinc-800 shadow-inner">
              {preview.isVideo ? (
                <video src={preview.url} className="w-full h-full object-contain" preload="metadata" controls />
              ) : (
                <img src={preview.url} alt="Story preview" className="w-full h-full object-contain" />
              )}
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-600 rounded-full text-white transition-all shadow-md active:scale-90"
                title="Gỡ ảnh/video"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-[360px] w-full bg-gradient-to-br from-blue-50/50 to-indigo-50/50 hover:from-blue-50 hover:to-indigo-50 dark:from-zinc-900 dark:to-zinc-900/60 border-2 border-dashed border-blue-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3.5 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shadow-xs">
                <PhotoIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">Chọn ảnh hoặc video cho Story</p>
                <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-1.5 leading-relaxed">Hỗ trợ các định dạng JPEG, PNG, GIF, MP4, WebM (Tối đa 50MB)</p>
              </div>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />

          {/* Duration Selector */}
          <div className="mt-4 bg-slate-50/70 dark:bg-zinc-900/40 p-4 rounded-3xl border border-slate-100 dark:border-zinc-800/80 flex flex-col gap-2.5">
            <label className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Thời gian hiển thị Story</span>
            </label>

            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
              {([5000, 10000, 15000, 30000] as number[]).map((val) => {
                const label = `${val / 1000} giây`;
                const isDisabled = videoDuration !== null && val > videoDuration * 1000;
                const isSelected = duration === val;

                return (
                  <button
                    key={val}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setDuration(val)}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : isDisabled
                        ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600"
                        : "bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}

              {/* Full Video Duration Option */}
              {videoDuration !== null && (
                <button
                  type="button"
                  onClick={() => setDuration(videoDuration * 1000)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                    duration === videoDuration * 1000
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600"
                  }`}
                >
                  Độ dài video ({Math.round(videoDuration)}s)
                </button>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {submitting && uploadProgress !== null && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 font-semibold mb-1">
                <span>Đang tải lên...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || !file}
            className="w-full mt-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-zinc-800 text-white font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang đăng Story...
              </>
            ) : (
              "Đăng Story"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
