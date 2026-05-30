"use client";
import React, { useState, useEffect } from "react";
import { XMarkIcon, ClockIcon, TrashIcon, ArrowPathIcon, EyeIcon, HeartIcon } from "@heroicons/react/24/outline";
import { postService, IStory } from "@/services/postService";
import { toast } from "sonner";

interface StoryArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryReposted?: () => void;
}

export default function StoryArchiveModal({ isOpen, onClose, onStoryReposted }: StoryArchiveModalProps) {
  const [archivedStories, setArchivedStories] = useState<IStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewStory, setPreviewStory] = useState<IStory | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchArchive();
    }
  }, [isOpen]);

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const list = await postService.getArchivedStories();
      setArchivedStories(list);
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi tải kho lưu trữ.");
    } finally {
      setLoading(false);
    }
  };

  const handleRepost = async (storyId: string) => {
    try {
      const result = await postService.repostStory(storyId);
      if (result) {
        toast.success("Đã đăng lại Story thành công!");
        setArchivedStories((prev) => prev.filter((s) => s._id !== storyId));
        if (onStoryReposted) onStoryReposted();
      } else {
        toast.error("Không thể đăng lại Story.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Đã xảy ra lỗi khi đăng lại Story.");
    }
  };

  const handlePermanentDelete = async (storyId: string) => {
    setDeleting(true);
    try {
      const result = await postService.deleteStoryPermanently(storyId);
      if (result) {
        toast.success("Đã xóa vĩnh viễn Story!");
        setArchivedStories((prev) => prev.filter((s) => s._id !== storyId));
        setDeleteConfirm(null);
        // Close preview if currently previewing the deleted story
        if (previewStory?._id === storyId) setPreviewStory(null);
      } else {
        toast.error("Không thể xóa Story.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Đã xảy ra lỗi khi xóa Story.");
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      const h = date.getHours().toString().padStart(2, "0");
      const min = date.getMinutes().toString().padStart(2, "0");
      return `${d}/${m}/${y} ${h}:${min}`;
    } catch {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <ClockIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">Kho lưu trữ Khoảnh khắc</h3>
            {archivedStories.length > 0 && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                {archivedStories.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="py-24 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : archivedStories.length === 0 ? (
            <div className="py-24 text-center text-sm text-gray-400 dark:text-zinc-500">
              <ClockIcon className="w-12 h-12 text-gray-200 dark:text-zinc-800 mx-auto mb-3" />
              <p>Kho lưu trữ khoảnh khắc của bạn trống.</p>
              <p className="text-xs text-gray-300 dark:text-zinc-600 mt-1">
                Các story sau khi hết hạn 24h hoặc khi bạn xóa sẽ được tự động lưu trữ tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {archivedStories.map((story) => (
                <div
                  key={story._id}
                  className="bg-gray-50 dark:bg-zinc-950/50 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all group"
                >
                  {/* Media Thumbnail Container — clickable for preview */}
                  <div
                    className="aspect-[9/16] relative bg-black flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => setPreviewStory(story)}
                  >
                    {story.mediaType === "VIDEO" ? (
                      <video src={story.mediaUrl} className="w-full h-full object-cover" preload="metadata" />
                    ) : (
                      <img src={story.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    )}

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35 opacity-90" />

                    {/* Info overlay (Date) */}
                    <div className="absolute top-2.5 left-2.5 text-[9px] font-bold text-white/90 bg-black/30 rounded-full px-2 py-0.5 backdrop-blur-xs">
                      {formatTime(story.createdAt)}
                    </div>

                    {/* Stats overlay (views + reactions) */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
                      {(story.viewCount || 0) > 0 && (
                        <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-xs rounded-full px-1.5 py-0.5">
                          <EyeIcon className="w-3 h-3 text-white/80" />
                          <span className="text-[9px] font-bold text-white/90">{story.viewCount}</span>
                        </div>
                      )}
                      {(story.reactionCount || 0) > 0 && (
                        <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-xs rounded-full px-1.5 py-0.5">
                          <HeartIcon className="w-3 h-3 text-white/80" />
                          <span className="text-[9px] font-bold text-white/90">{story.reactionCount}</span>
                        </div>
                      )}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <EyeIcon className="w-8 h-8 text-white/80" />
                    </div>

                    {story.caption && (
                      <div className="absolute bottom-2 inset-x-2 px-1 text-center">
                        <p className="text-[10px] text-white font-medium truncate drop-shadow-md">
                          {story.caption}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="p-2.5 bg-white dark:bg-zinc-900 border-t border-gray-50 dark:border-zinc-800/50 flex gap-1.5">
                    <button
                      onClick={() => handleRepost(story._id)}
                      className="flex-1 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[10px] font-bold transition-colors active:scale-95 flex items-center justify-center gap-1"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      Đăng lại
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(story._id)}
                      className="py-1.5 px-3 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-[10px] font-bold transition-colors active:scale-95 flex items-center justify-center gap-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-3">
              <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <h4 className="text-base font-bold text-gray-950 dark:text-zinc-50 mb-1">
              Xóa vĩnh viễn Story?
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Story này sẽ bị xóa hoàn toàn khỏi hệ thống và <strong>không thể khôi phục</strong>. Bạn có chắc chắn?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/60 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all active:scale-95 shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang xóa...
                  </>
                ) : (
                  "Xóa vĩnh viễn"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Lightbox */}
      {previewStory && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewStory(null)}
        >
          <div
            className="relative max-w-md w-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewStory(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Story info */}
            <div className="absolute top-4 left-4 z-20">
              <div className="text-xs font-bold text-white bg-black/40 backdrop-blur-xs rounded-full px-3 py-1">
                {formatTime(previewStory.createdAt)}
              </div>
            </div>

            {/* Media */}
            {previewStory.mediaType === "VIDEO" ? (
              <video
                src={previewStory.mediaUrl}
                className="w-full max-h-[85vh] object-contain bg-black"
                controls
                autoPlay
              />
            ) : (
              <img
                src={previewStory.mediaUrl}
                alt="Story preview"
                className="w-full max-h-[85vh] object-contain bg-black"
              />
            )}

            {/* Caption */}
            {previewStory.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
                <p className="text-sm text-white font-medium text-center">{previewStory.caption}</p>
              </div>
            )}

            {/* Stats bar */}
            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              {(previewStory.viewCount || 0) > 0 && (
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xs rounded-full px-2.5 py-1">
                  <EyeIcon className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-[11px] font-bold text-white/90">{previewStory.viewCount} lượt xem</span>
                </div>
              )}
              {(previewStory.reactionCount || 0) > 0 && (
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xs rounded-full px-2.5 py-1">
                  <HeartIcon className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-[11px] font-bold text-white/90">{previewStory.reactionCount} cảm xúc</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
