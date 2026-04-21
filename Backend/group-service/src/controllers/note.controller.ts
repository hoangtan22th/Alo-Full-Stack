import { Request, Response } from "express";
import mongoose from "mongoose";
import Note from "../models/Note";
import Conversation from "../models/Conversation";
import rabbitMQProducer from "../services/rabbitMQProducer";

// Helper check ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getNotesByConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = (req.params["groupId"] || "").toString();
    if (!isValidId(groupId)) {
      res.status(400).json({ error: "ID nhóm không hợp lệ" });
      return;
    }

    const notes = await Note.find({ conversationId: groupId }).sort({ createdAt: -1 });
    res.json({ status: 200, data: notes });
  } catch (error: any) {
    console.error("Error in getNotesByConversation:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = (req.params["groupId"] || "").toString();
    const creatorId = (req.headers["x-user-id"] || "").toString();
    const { content, links } = req.body;

    if (!isValidId(groupId)) {
      res.status(400).json({ error: "ID nhóm không hợp lệ" });
      return;
    }

    if (!content) {
      res.status(400).json({ error: "Nội dung ghi chú là bắt buộc" });
      return;
    }

    const conversation = await Conversation.findById(groupId);
    if (!conversation) {
      res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });
      return;
    }

    // Check permissions
    const member = conversation.members.find(m => m.userId.toString() === creatorId);
    if (!member) {
      res.status(403).json({ error: "Bạn không phải thành viên nhóm" });
      return;
    }

    const isManager = member.role === "LEADER" || member.role === "DEPUTY";
    const permission = conversation.permissions?.createNotes || "EVERYONE";

    if (!isManager && permission === "ADMIN") {
      res.status(403).json({ error: "Chỉ trưởng/phó nhóm mới có quyền tạo ghi chú" });
      return;
    }

    const newNote = new Note({
      conversationId: groupId,
      creatorId,
      content,
      links: Array.isArray(links) ? links : [],
    });

    await newNote.save();
    
    // Real-time broadcast
    rabbitMQProducer.publishNoteCreated(groupId, newNote).catch(console.error);

    res.status(201).json({ status: 201, data: newNote });
  } catch (error: any) {
    console.error("Error in createNote:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteId = (req.params["noteId"] || "").toString();
    const requesterId = (req.headers["x-user-id"] || "").toString();

    if (!isValidId(noteId)) {
      res.status(400).json({ error: "ID ghi chú không hợp lệ" });
      return;
    }

    const note = await Note.findById(noteId);
    if (!note) {
      res.status(404).json({ error: "Không tìm thấy ghi chú" });
      return;
    }

    const conversation = await Conversation.findById(note.conversationId);
    if (!conversation) {
      // If conversation is gone, allow deletion if requester is creator or we can just proceed
      if (note.creatorId.toString() !== requesterId) {
        res.status(403).json({ error: "Bạn không có quyền xóa ghi chú này" });
        return;
      }
    } else {
       const member = conversation.members.find(m => m.userId.toString() === requesterId);
       const isManager = member?.role === "LEADER" || member?.role === "DEPUTY";
       const isCreator = note.creatorId.toString() === requesterId;

       if (!isManager && !isCreator) {
         res.status(403).json({ error: "Bạn không có quyền xóa ghi chú này" });
         return;
       }
    }

    await Note.findByIdAndDelete(noteId);
    
    // Real-time broadcast
    rabbitMQProducer.publishNoteDeleted(note.conversationId.toString(), noteId).catch(console.error);

    res.json({ status: 200, message: "Đã xóa ghi chú thành công" });
  } catch (error: any) {
    console.error("Error in deleteNote:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const noteId = (req.params["noteId"] || "").toString();
    const requesterId = (req.headers["x-user-id"] || "").toString();
    const { content, links } = req.body;

    if (!isValidId(noteId)) {
      res.status(400).json({ error: "ID ghi chú không hợp lệ" });
      return;
    }

    const note = await Note.findById(noteId);
    if (!note) {
      res.status(404).json({ error: "Không tìm thấy ghi chú" });
      return;
    }

    // Only creator can edit
    if (note.creatorId.toString() !== requesterId) {
      res.status(403).json({ error: "Bạn không có quyền chỉnh sửa ghi chú này" });
      return;
    }

    if (content) note.content = content;
    if (links) note.links = Array.isArray(links) ? links : note.links;

    await note.save();

    // Real-time broadcast
    rabbitMQProducer.publishNoteUpdated(note.conversationId.toString(), note).catch(console.error);

    res.json({ status: 200, data: note });
  } catch (error: any) {
    console.error("Error in updateNote:", error);
    res.status(500).json({ error: error.message });
  }
};
