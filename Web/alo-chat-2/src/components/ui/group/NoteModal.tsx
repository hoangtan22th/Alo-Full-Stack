"use client";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { noteService, NoteDTO } from "@/services/noteService";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

interface NoteModalProps {
  conversationId: string;
  canCreate?: boolean;
  onClose: () => void;
}

export default function NoteModal({ conversationId, canCreate = true, onClose }: NoteModalProps) {
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteDTO | null>(null);
  
  const { userId: currentUserId } = useAuthStore();

  // Create/Edit Note State
  const [content, setContent] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");

  useEffect(() => {
    fetchNotes();
  }, [conversationId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const data = await noteService.getNotesByConversation(conversationId);
      
      // Kiểm tra data hợp lệ trước khi sắp xếp
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotes(sortedData);
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách ghi chú");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    setLinks([...links, newLink.trim()]);
    setNewLink("");
  };

  const handleRemoveLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  const handleSaveNote = async () => {
    if (!content.trim()) return toast.error("Vui lòng nhập nội dung ghi chú");

    try {
      if (editingNote) {
        const updated = await noteService.updateNote(editingNote._id, content, links);
        if (updated) {
          toast.success("Đã cập nhật ghi chú");
          handleReset();
          fetchNotes();
        }
      } else {
        const created = await noteService.createNote(conversationId, content, links);
        if (created) {
          toast.success("Đã tạo ghi chú mới");
          handleReset();
          fetchNotes();
        }
      }
    } catch (err) {
      toast.error("Lỗi khi lưu ghi chú");
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) return;
    try {
      const success = await noteService.deleteNote(id);
      if (success) {
        toast.success("Đã xóa ghi chú");
        fetchNotes();
      }
    } catch (err) {
      toast.error("Lỗi khi xóa ghi chú");
    }
  };

  const handleEditNote = (note: NoteDTO) => {
    setEditingNote(note);
    setContent(note.content);
    setLinks(note.links || []);
    setShowCreate(true);
  };

  const handleReset = () => {
    setShowCreate(false);
    setEditingNote(null);
    setContent("");
    setLinks([]);
    setNewLink("");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Ghi chú</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Lưu trữ thông tin quan trọng</p>
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
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Nội dung</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung ghi chú..."
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-black/10 transition resize-none"
                  rows={5}
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Liên kết (Links)</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      placeholder="Dán liên kết vào đây..."
                      className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-black/10 transition"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                    />
                    <button 
                      onClick={handleAddLink}
                      className="px-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                    >
                      <PlusIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {links.map((link, idx) => (
                      <div key={idx} className="bg-gray-100 text-black rounded-full text-[11px] font-black group px-3 py-1 flex items-center gap-1">
                        <span className="truncate max-w-[200px]">{link}</span>
                        <button onClick={() => handleRemoveLink(idx)} className="hover:text-red-500">
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
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
                  onClick={handleSaveNote}
                  className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-black text-white shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition"
                >
                  {editingNote ? "CẬP NHẬT GHI CHÚ" : "LƯU GHI CHÚ"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {canCreate && (
                <button 
                  onClick={() => setShowCreate(true)}
                  className="w-full mb-6 py-4 flex items-center justify-center gap-3 bg-gray-50 text-black rounded-2xl border-2 border-dashed border-gray-200 hover:bg-gray-100 hover:border-black transition group"
                >
                  <PlusIcon className="w-5 h-5 group-hover:scale-110 transition" />
                  <span className="text-[14px] font-black uppercase tracking-tight">Thêm ghi chú mới</span>
                </button>
              )}

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-3" />
                  </div>
                ) : notes.length > 0 ? (
                  notes.map((note) => (
                    <div key={note._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-black/20 transition group relative">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[14px] font-medium text-gray-800 leading-relaxed pr-8 whitespace-pre-wrap">{note.content}</p>
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          {(note.creatorId === currentUserId) && (
                            <button onClick={() => handleEditNote(note)} className="p-1.5 bg-white shadow-sm rounded-lg text-black hover:bg-gray-100 transition">
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteNote(note._id)} className="p-1.5 bg-white shadow-sm rounded-lg text-red-500 hover:bg-red-50 transition">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {note.links && note.links.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {note.links.map((link, i) => (
                            <a 
                              key={i} 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-black font-black hover:underline uppercase tracking-tighter text-[10px] bg-gray-100 px-2 py-0.5 rounded-md inline-block mt-1"
                            >
                              🔗 {link.length > 30 ? link.substring(0, 30) + "..." : link}
                            </a>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] font-medium text-gray-400 mt-3 border-t border-gray-100 pt-2">
                        {new Date(note.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center py-10 opacity-40">
                    <DocumentTextIcon className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold italic">Chưa có ghi chú nào</p>
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
